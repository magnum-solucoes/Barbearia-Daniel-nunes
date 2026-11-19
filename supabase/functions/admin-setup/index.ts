import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Constant-time string comparison to avoid leaking the token via timing.
function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Normalizes a token so that accidental surrounding whitespace, newlines or
// wrapping quotes (common when pasting from a password manager) never cause a
// false "invalid token" result. Only trims surrounding noise — the token body
// is compared exactly and still in constant time.
function normalizeToken(value: string | undefined | null): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^["'`]+|["'`]+$/g, "").trim();
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

// One-time first-admin bootstrap. Guarded by:
//  1. The ADMIN_SETUP_TOKEN backend secret (never shipped to the frontend).
//  2. A server-side check that no administrator exists yet.
//  3. A unique partial index (admin_users_single_owner) that makes it
//     physically impossible to store more than one owner, even under
//     simultaneous attempts. If the claim fails, the orphan auth account is
//     deleted so no privileged user is ever left behind.
// After the first owner exists this endpoint permanently refuses to work.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const setupToken = normalizeToken(Deno.env.get("ADMIN_SETUP_TOKEN"));

    if (!url || !serviceKey) {
      return json({ error: "SERVER_ERROR", message: "Servidor mal configurado." }, 500);
    }
    if (!setupToken) {
      return json(
        { error: "SETUP_DISABLED", message: "A configuração inicial está desativada." },
        403,
      );
    }

    const body = await readJson(req);
    const token = typeof body.token === "string" ? body.token : "";
    const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    // Token check first, with a small delay to slow down brute-force attempts.
    if (!token || !safeEqual(normalizeToken(token), setupToken)) {
      await new Promise((r) => setTimeout(r, 400));
      return json({ error: "INVALID_TOKEN", message: "Token de configuração inválido." }, 403);
    }

    if (!EMAIL_RE.test(email)) {
      return json({ error: "INVALID_EMAIL", message: "Informe um e-mail válido." }, 400);
    }
    if (password.length < MIN_PASSWORD) {
      return json(
        { error: "WEAK_PASSWORD", message: `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.` },
        400,
      );
    }

    const client = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Fast fail: if an administrator already exists, bootstrap is closed.
    const { count } = await client
      .from("admin_users")
      .select("user_id", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return json(
        { error: "ALREADY_CONFIGURED", message: "A configuração inicial já foi concluída." },
        409,
      );
    }

    // Create the auth user (email confirmed) via the privileged admin API.
    const { data: created, error: createErr } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !created?.user) {
      const raw = createErr?.message ?? "";
      const message = /already|registered|exists/i.test(raw)
        ? "Já existe uma conta com este e-mail."
        : "Não foi possível criar o usuário.";
      return json({ error: "USER_CREATE_FAILED", message }, 400);
    }

    const userId = created.user.id;

    // Atomically claim the single owner slot. The unique partial index
    // admin_users_single_owner rejects any additional owner at the database level.
    const { error: linkErr } = await client
      .from("admin_users")
      .insert({ user_id: userId, email, role: "owner" });

    if (linkErr) {
      // Any failure means we did not become the owner: remove our orphan
      // account so no privileged user is left behind.
      try {
        await client.auth.admin.deleteUser(userId);
      } catch {
        /* best effort */
      }
      if (linkErr.code === "23505") {
        return json(
          { error: "ALREADY_CONFIGURED", message: "A configuração inicial já foi concluída." },
          409,
        );
      }
      return json({ error: "LINK_FAILED", message: "Não foi possível concluir a configuração." }, 500);
    }

    return json({ ok: true, message: "Administrador criado com sucesso." });
  } catch (e) {
    return json({ error: "SERVER_ERROR", message: String(e) }, 500);
  }
});
