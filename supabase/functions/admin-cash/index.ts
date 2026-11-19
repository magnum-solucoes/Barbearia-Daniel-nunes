import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const METHODS = ["pix", "cash", "debit", "credit", "other"];
const DEFAULT_TZ = "America/Campo_Grande";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function todayInTz(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

async function requireAdmin(req: Request): Promise<{ ok: boolean; status?: number; message?: string; client?: any; user?: any }> {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return { ok: false, status: 500, message: "Servidor mal configurado." };

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return { ok: false, status: 401, message: "Autenticação necessária." };

  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return { ok: false, status: 401, message: "Sessão inválida ou expirada." };

  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: adminRow } = await adminClient.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!adminRow) return { ok: false, status: 403, message: "Acesso restrito a administradores." };
  return { ok: true, client: adminClient, user };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return json({ error: "UNAUTHORIZED", message: auth.message }, auth.status || 401);
    const client = auth.client;

    const body = await readJson(req);
    const action = String(body.action || "");

    const { data: settings } = await client.from("settings").select("timezone").eq("id", 1).maybeSingle();
    const timeZone = settings?.timezone || DEFAULT_TZ;

    if (action === "add_entry") {
      const type = String(body.type || "income");
      const amount = Number(body.amount);
      const method = body.method ? String(body.method) : null;
      const appointmentId = body.appointment_id ? String(body.appointment_id) : null;
      const description = body.description ? String(body.description).slice(0, 300) : null;
      const entryDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.entry_date || "")) ? String(body.entry_date) : todayInTz(timeZone);

      if (!["income", "expense"].includes(type)) {
        return json({ error: "INVALID_TYPE", message: "Tipo de lançamento inválido." }, 400);
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return json({ error: "INVALID_AMOUNT", message: "Informe um valor maior que zero." }, 400);
      }
      if (method && !METHODS.includes(method)) {
        return json({ error: "INVALID_METHOD", message: "Forma de pagamento inválida." }, 400);
      }

      if (type === "income" && appointmentId) {
        const { data: appt } = await client
          .from("appointments")
          .select("id, service_price_snapshot, client_name")
          .eq("id", appointmentId)
          .maybeSingle();
        if (!appt) return json({ error: "APPOINTMENT_NOT_FOUND", message: "Agendamento não encontrado." }, 404);

        const { data: prodRows } = await client
          .from("appointment_products")
          .select("product_price_snapshot, quantity")
          .eq("appointment_id", appointmentId)
          .eq("status", "reserved");
        const productsDue = (prodRows || []).reduce(
          (s: number, r: any) => s + Number(r.product_price_snapshot) * Number(r.quantity),
          0,
        );
        const due = (Number(appt.service_price_snapshot) || 0) + productsDue;
        const { data: existing } = await client
          .from("cash_entries")
          .select("amount")
          .eq("type", "income")
          .eq("appointment_id", appointmentId);
        const paid = (existing || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        const remaining = Math.round((due - paid) * 100) / 100;

        if (amount > remaining + 0.001) {
          return json(
            {
              error: "PAYMENT_EXCEEDS",
              message: `O valor ultrapassa o saldo devido. Restam ${remaining.toFixed(2)} de ${due.toFixed(2)}.`,
              remaining,
              due,
              paid,
            },
            409,
          );
        }
      }

      const { data: created, error: insertError } = await client
        .from("cash_entries")
        .insert({ type, amount, method, appointment_id: appointmentId, description, entry_date: entryDate })
        .select("*")
        .single();
      if (insertError) return json({ error: "INSERT_FAILED", message: "Não foi possível registrar o lançamento." }, 500);

      return json({ ok: true, entry: created });
    }

    if (action === "delete_entry") {
      const id = String(body.id || "");
      if (!id) return json({ error: "INVALID_INPUT", message: "Lançamento inválido." }, 400);
      const { error: delErr } = await client.from("cash_entries").delete().eq("id", id);
      if (delErr) return json({ error: "DELETE_FAILED", message: "Não foi possível excluir o lançamento." }, 500);
      return json({ ok: true });
    }

    return json({ error: "UNKNOWN_ACTION", message: "Ação não suportada." }, 400);
  } catch (e) {
    return json({ error: "SERVER_ERROR", message: String(e) }, 500);
  }
});
