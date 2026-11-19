import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STEP_MINUTES = 15;
const DEFAULT_TZ = "America/Campo_Grande";
const MAX_NOTES = 500;
const ALLOWED_STATUS = ["pending", "confirmed", "completed", "cancelled", "no_show"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = map.hour === "24" ? "0" : map.hour;
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +hour, +map.minute, +map.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

function localToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const offset = tzOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60000);
}

function weekdayOf(dateStr: string, timeZone: string): number {
  const instant = localToUtc(dateStr, "12:00", timeZone);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(instant);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 0;
}

function parseTime(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Resolves the correct weekday price for a service on the server. */
function resolvePrice(service: any, weekday: number) {
  const promoWeekdays = Array.isArray(service.promo_weekdays) ? service.promo_weekdays : [];
  const hasPromo =
    Boolean(service.promo_enabled) && service.promo_price != null && promoWeekdays.includes(weekday);
  if (hasPromo) return { price: Number(service.promo_price), applied: true, available: true };
  if (service.promo_only) return { price: 0, applied: false, available: false };
  return { price: Number(service.price), applied: false, available: true };
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
  const { data: adminRow } = await adminClient
    .from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();

  if (!adminRow) return { ok: false, status: 403, message: "Acesso restrito a administradores." };
  return { ok: true, client: adminClient, user };
}

async function recordEvent(client: any, payload: Record<string, unknown>) {
  try {
    const { error } = await client.from("appointment_events").insert(payload);
    if (error && error.code !== "23505") {
      await client.from("appointment_event_outbox").insert({ payload, status: "pending" });
    }
  } catch {
    try { await client.from("appointment_event_outbox").insert({ payload, status: "pending" }); } catch { /* silencioso */ }
  }
}

// Resolves optional upsell products on the server. Prices come from the catalog,
// never from the browser payload.
async function resolveProducts(client: any, rawProducts: unknown[]): Promise<any> {
  const plan: { id: string; name: string; price: number; quantity: number; duration_minutes: number }[] = [];
  const seen = new Set<string>();
  const selections: { product_id: string; quantity: number }[] = [];
  for (const raw of rawProducts) {
    if (!raw || typeof raw !== "object") continue;
    const pid = typeof (raw as { product_id?: unknown }).product_id === "string"
      ? String((raw as { product_id: string }).product_id)
      : "";
    const qtyRaw = Number((raw as { quantity?: unknown }).quantity ?? 1);
    const qty = Number.isFinite(qtyRaw) ? Math.floor(qtyRaw) : 0;
    if (!pid || qty < 1 || seen.has(pid)) continue;
    seen.add(pid);
    selections.push({ product_id: pid, quantity: qty });
  }
  if (selections.length === 0) return { plan, total: 0, addonMinutes: 0 };

  const ids = selections.map((s) => s.product_id);
  const { data: found } = await client.from("booking_products").select("id, name, price, max_quantity, active, kind, duration_minutes").in("id", ids);
  const catalog = (found || []) as { id: string; name: string; price: number; max_quantity: number; active: boolean; kind: string; duration_minutes: number }[];
  for (const sel of selections) {
    const match = catalog.find((p) => p.id === sel.product_id);
    if (!match || !match.active) {
      return { error: "PRODUCT_UNAVAILABLE", message: "Um dos produtos selecionados não está mais disponível.", plan: [], total: 0 };
    }
    const maxQ = Number(match.max_quantity) || 1;
    if (sel.quantity < 1 || sel.quantity > maxQ) {
      return { error: "INVALID_QUANTITY", message: "Quantidade de produto inválida para este item.", plan: [], total: 0 };
    }
    plan.push({ id: match.id, name: match.name, price: Number(match.price), quantity: sel.quantity, duration_minutes: Number(match.duration_minutes) || 0 });
  }
  const total = plan.reduce((s, p) => s + p.price * p.quantity, 0);
  const addonMinutes = plan.reduce((s, p) => s + p.duration_minutes * p.quantity, 0);
  return { plan, total, addonMinutes };
}

async function evaluateSlot(ctx: { client: any; dateStr: string; timeZone: string; duration: number }, timeStr: string) {
  const { client, dateStr, timeZone, duration } = ctx;

  const weekday = weekdayOf(dateStr, timeZone);
  const { data: hours } = await client.from("business_hours").select("*").eq("weekday", weekday).maybeSingle();
  if (!hours || !hours.is_open || !hours.open_time || !hours.close_time) {
    return { ok: false, error: "CLOSED", message: "A barbearia está fechada nesse dia." };
  }

  const openMin = parseTime(hours.open_time)!;
  const closeMin = parseTime(hours.close_time)!;
  const breakStart = parseTime(hours.break_start);
  const breakEnd = parseTime(hours.break_end);

  const startUtc = localToUtc(dateStr, timeStr, timeZone);
  const endUtc = new Date(startUtc.getTime() + duration * 60000);

  const dayStartUtc = localToUtc(dateStr, "00:00", timeZone);
  const startMin = Math.round((startUtc.getTime() - dayStartUtc.getTime()) / 60000);
  const endMin = startMin + duration;

  if (startMin < openMin || endMin > closeMin) {
    return { ok: false, error: "OUT_OF_HOURS", message: "Horário fora do funcionamento." };
  }
  if (breakStart !== null && breakEnd !== null && overlaps(startMin, endMin, breakStart, breakEnd)) {
    return { ok: false, error: "ON_BREAK", message: "Horário coincide com uma pausa." };
  }

  const { data: blocks } = await client.from("blocked_slots").select("start_time, end_time").eq("block_date", dateStr);
  for (const b of blocks || []) {
    if (!b.start_time && !b.end_time) return { ok: false, error: "DAY_BLOCKED", message: "Este dia está bloqueado." };
    const bs = b.start_time ? parseTime(b.start_time)! : openMin;
    const be = b.end_time ? parseTime(b.end_time)! : closeMin;
    if (bs < be && overlaps(startMin, endMin, bs, be)) {
      return { ok: false, error: "BLOCKED", message: "Este horário está bloqueado." };
    }
  }

  return { ok: true, startUtc, endUtc };
}

async function listSlots(ctx: { client: any; dateStr: string; timeZone: string; duration: number; excludeId?: string | null }) {
  const { client, dateStr, timeZone, duration, excludeId } = ctx;

  const weekday = weekdayOf(dateStr, timeZone);
  const { data: hours } = await client.from("business_hours").select("*").eq("weekday", weekday).maybeSingle();
  if (!hours || !hours.is_open || !hours.open_time || !hours.close_time) {
    return { closed: true, reason: "WEEKDAY_CLOSED", slots: [] as string[] };
  }

  const openMin = parseTime(hours.open_time)!;
  const closeMin = parseTime(hours.close_time)!;
  const breakStart = parseTime(hours.break_start);
  const breakEnd = parseTime(hours.break_end);

  const { data: blocks } = await client.from("blocked_slots").select("start_time, end_time").eq("block_date", dateStr);
  const blockRanges: Array<[number, number]> = [];
  for (const b of blocks || []) {
    if (!b.start_time && !b.end_time) return { closed: true, reason: "DAY_BLOCKED", slots: [] as string[] };
    const bs = b.start_time ? parseTime(b.start_time)! : openMin;
    const be = b.end_time ? parseTime(b.end_time)! : closeMin;
    if (bs < be) blockRanges.push([bs, be]);
  }

  const dayStartUtc = localToUtc(dateStr, "00:00", timeZone);
  const dayEndUtc = new Date(dayStartUtc.getTime() + 86400000);

  let query = client.from("appointments").select("id, start_at, end_at")
    .neq("status", "cancelled")
    .lt("start_at", dayEndUtc.toISOString())
    .gt("end_at", dayStartUtc.toISOString());
  if (excludeId) query = query.neq("id", excludeId);

  const { data: appts } = await query;
  const busy: Array<[number, number]> = [];
  for (const a of appts || []) {
    const s = new Date(a.start_at).getTime();
    const e = new Date(a.end_at).getTime();
    busy.push([Math.round((s - dayStartUtc.getTime()) / 60000), Math.round((e - dayStartUtc.getTime()) / 60000)]);
  }

  const slots: string[] = [];
  const lastStart = closeMin - duration;
  for (let start = openMin; start <= lastStart; start += STEP_MINUTES) {
    const end = start + duration;
    if (breakStart !== null && breakEnd !== null && overlaps(start, end, breakStart, breakEnd)) continue;
    if (blockRanges.some(([bs, be]) => overlaps(start, end, bs, be))) continue;
    if (busy.some(([bs, be]) => overlaps(start, end, bs, be))) continue;
    slots.push(minutesToHHMM(start));
  }
  return { closed: false, reason: null, slots };
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

    if (action === "availability") {
      const serviceId = String(body.service_id || "");
      const dateStr = String(body.date || "");
      const excludeId = body.exclude_id ? String(body.exclude_id) : null;
      if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return json({ error: "INVALID_INPUT", message: "Serviço e data são obrigatórios." }, 400);
      }
      const { data: service } = await client.from("services").select("id, name, price, duration_minutes, active, promo_enabled, promo_price, promo_weekdays, promo_only").eq("id", serviceId).maybeSingle();
      if (!service) return json({ error: "SERVICE_NOT_FOUND", message: "Serviço não encontrado." }, 404);
      const duration = Number(service.duration_minutes) || 0;
      const resolved = resolvePrice(service, weekdayOf(dateStr, timeZone));
      if (!resolved.available) {
        return json({ ok: true, timezone: timeZone, date: dateStr, service: { id: service.id, name: service.name, price: 0, duration_minutes: duration }, closed: true, reason: "PROMO_ONLY", slots: [] });
      }
      const result = await listSlots({ client, dateStr, timeZone, duration, excludeId });
      return json({ ok: true, timezone: timeZone, date: dateStr, service: { id: service.id, name: service.name, price: resolved.price, base_price: Number(service.price), promo_applied: resolved.applied, duration_minutes: duration }, ...result });
    }

    if (action === "create") {
      const serviceId = String(body.service_id || "");
      const dateStr = String(body.date || "");
      const timeStr = String(body.time || "");
      const clientName = String(body.client_name ?? "").trim();
      const clientPhone = String(body.client_phone ?? "").replace(/\D/g, "");
      const notes = body.notes ? String(body.notes).slice(0, MAX_NOTES) : null;
      const status = ALLOWED_STATUS.includes(String(body.status)) ? String(body.status) : "pending";
      const rawProducts = Array.isArray(body.products) ? (body.products as unknown[]) : [];
      const rawParticipants = Array.isArray(body.participants)
        ? (body.participants as unknown[]).map((p) => String(p ?? "").trim()).filter((n) => n.length > 0)
        : [];

      if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) {
        return json({ error: "INVALID_INPUT", message: "Dados do agendamento incompletos." }, 400);
      }
      if (clientName.length < 2 || clientName.length > 80) {
        return json({ error: "INVALID_NAME", message: "Informe o nome do cliente." }, 400);
      }
      if (clientPhone.length < 10 || clientPhone.length > 13) {
        return json({ error: "INVALID_PHONE", message: "Informe um telefone válido com DDD." }, 400);
      }

      const { data: service } = await client.from("services").select("id, name, price, duration_minutes, active, promo_enabled, promo_price, promo_weekdays, promo_only, participants_count").eq("id", serviceId).maybeSingle();
      if (!service || !service.active) return json({ error: "SERVICE_UNAVAILABLE", message: "Serviço indisponível." }, 404);
      const duration = Number(service.duration_minutes) || 0;

      // Two-person packages require each participant name (count from the server).
      const participantsCount = Number(service.participants_count) || 1;
      let participantNames: string[] = [];
      if (participantsCount > 1) {
        if (rawParticipants.length < participantsCount) {
          return json({ error: "INVALID_PARTICIPANTS", message: "Informe o nome de todos os participantes do pacote." }, 400);
        }
        participantNames = rawParticipants.slice(0, participantsCount);
      }

      // Server-resolved weekday price (combo only on promo days).
      const resolvedService = resolvePrice(service, weekdayOf(dateStr, timeZone));
      if (!resolvedService.available) {
        return json({ error: "PROMO_ONLY", message: "Este serviço só está disponível nos dias da promoção (segunda a quarta)." }, 409);
      }

      const resolved = await resolveProducts(client, rawProducts);
      if (resolved.error) return json({ error: resolved.error, message: resolved.message }, resolved.error === "PRODUCT_UNAVAILABLE" ? 409 : 400);
      const productPlan = resolved.plan as { id: string; name: string; price: number; quantity: number; duration_minutes: number }[];
      // Additional services extend the slot; products add no time.
      const totalDuration = duration + (Number(resolved.addonMinutes) || 0);

      const slot = await evaluateSlot({ client, dateStr, timeZone, duration: totalDuration }, timeStr);
      if (!slot.ok) return json({ error: slot.error, message: slot.message }, 409);

      const { data: created, error: insertError } = await client.from("appointments").insert({
        service_id: service.id,
        service_name_snapshot: service.name,
        service_price_snapshot: resolvedService.price,
        service_duration_snapshot: totalDuration,
        client_name: clientName,
        client_phone: clientPhone,
        start_at: slot.startUtc!.toISOString(),
        end_at: slot.endUtc!.toISOString(),
        status,
        notes,
        participant_names: participantNames,
      }).select("*").single();

      if (insertError) {
        if (insertError.code === "23P01") return json({ error: "SLOT_TAKEN", message: "Já existe um agendamento nesse horário." }, 409);
        return json({ error: "INSERT_FAILED", message: "Não foi possível criar o agendamento." }, 500);
      }

      await recordEvent(client, {
        appointment_id: created.id, event_type: "created", before_data: null, after_data: created,
        actor: "admin", idempotency_key: `admin-create:${created.id}`,
      });

      if (productPlan.length > 0) {
        const { error: prodErr } = await client.from("appointment_products").insert(
          productPlan.map((p) => ({
            appointment_id: created.id,
            product_id: p.id,
            product_name_snapshot: p.name,
            product_price_snapshot: p.price,
            duration_minutes_snapshot: p.duration_minutes,
            quantity: p.quantity,
            status: "reserved",
          })),
        );
        if (prodErr) {
          await client.from("appointments").delete().eq("id", created.id);
          return json({ error: "PRODUCT_INSERT_FAILED", message: "Não foi possível registrar os produtos. Agendamento cancelado." }, 500);
        }
      }

      return json({ ok: true, appointment: created });
    }

    if (action === "set_status") {
      const appointmentId = String(body.appointment_id || "");
      const status = String(body.status || "");
      const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).slice(0, 100) : null;
      if (!appointmentId || !ALLOWED_STATUS.includes(status)) {
        return json({ error: "INVALID_INPUT", message: "Dados inválidos." }, 400);
      }
      const { data: existing } = await client.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
      if (!existing) return json({ error: "NOT_FOUND", message: "Agendamento não encontrado." }, 404);

      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "completed") patch.completed_at = new Date().toISOString();

      const { data: updated, error: updErr } = await client.from("appointments").update(patch).eq("id", appointmentId).select("*").single();
      if (updErr) return json({ error: "UPDATE_FAILED", message: "Não foi possível atualizar o status." }, 500);

      const eventType = status === "no_show" ? "no_show" : "status_changed";
      await recordEvent(client, {
        appointment_id: appointmentId, event_type: eventType, before_data: existing, after_data: updated,
        actor: "admin", idempotency_key: idempotencyKey || `status:${appointmentId}:${status}`,
      });
      return json({ ok: true, appointment: updated });
    }

    if (action === "reschedule") {
      const appointmentId = String(body.appointment_id || "");
      const dateStr = String(body.date || "");
      const timeStr = String(body.time || "");
      const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).slice(0, 100) : null;
      if (!appointmentId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) {
        return json({ error: "INVALID_INPUT", message: "Dados inválidos." }, 400);
      }
      const { data: existing } = await client.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
      if (!existing) return json({ error: "NOT_FOUND", message: "Agendamento não encontrado." }, 404);
      if (existing.status === "cancelled") return json({ error: "CANCELLED", message: "Não é possível remarcar um agendamento cancelado." }, 409);

      const duration = Number(existing.service_duration_snapshot) || 0;
      if (duration <= 0) return json({ error: "INVALID_DURATION", message: "Duração inválida." }, 400);

      const weekday = weekdayOf(dateStr, timeZone);
      const { data: hours } = await client.from("business_hours").select("*").eq("weekday", weekday).maybeSingle();
      if (!hours || !hours.is_open || !hours.open_time || !hours.close_time) {
        return json({ error: "CLOSED", message: "A barbearia está fechada nesse dia." }, 409);
      }
      const openMin = parseTime(hours.open_time)!;
      const closeMin = parseTime(hours.close_time)!;
      const breakStart = parseTime(hours.break_start);
      const breakEnd = parseTime(hours.break_end);

      const startUtc = localToUtc(dateStr, timeStr, timeZone);
      const endUtc = new Date(startUtc.getTime() + duration * 60000);
      const dayStartUtc = localToUtc(dateStr, "00:00", timeZone);
      const startMin = Math.round((startUtc.getTime() - dayStartUtc.getTime()) / 60000);
      const endMin = startMin + duration;

      if (startMin < openMin || endMin > closeMin) return json({ error: "OUT_OF_HOURS", message: "Horário fora do funcionamento." }, 409);
      if (breakStart !== null && breakEnd !== null && overlaps(startMin, endMin, breakStart, breakEnd)) {
        return json({ error: "ON_BREAK", message: "Horário coincide com uma pausa." }, 409);
      }
      const { data: blocks } = await client.from("blocked_slots").select("start_time, end_time").eq("block_date", dateStr);
      for (const b of blocks || []) {
        if (!b.start_time && !b.end_time) return json({ error: "DAY_BLOCKED", message: "Este dia está bloqueado." }, 409);
        const bs = b.start_time ? parseTime(b.start_time)! : openMin;
        const be = b.end_time ? parseTime(b.end_time)! : closeMin;
        if (bs < be && overlaps(startMin, endMin, bs, be)) return json({ error: "BLOCKED", message: "Este horário está bloqueado." }, 409);
      }

      const { data: updated, error: updErr } = await client.from("appointments").update({
        start_at: startUtc.toISOString(), end_at: endUtc.toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", appointmentId).select("*").single();
      if (updErr) {
        if (updErr.code === "23P01") return json({ error: "SLOT_TAKEN", message: "Esse horário já está ocupado." }, 409);
        return json({ error: "UPDATE_FAILED", message: "Não foi possível remarcar." }, 500);
      }

      await recordEvent(client, {
        appointment_id: appointmentId, event_type: "rescheduled", before_data: existing, after_data: updated,
        actor: "admin", idempotency_key: idempotencyKey || `reschedule:${appointmentId}:${updated.start_at}`,
      });
      return json({ ok: true, appointment: updated, previous: { start_at: existing.start_at, end_at: existing.end_at } });
    }

    if (action === "delete") {
      const appointmentId = String(body.appointment_id || "");
      if (!appointmentId) return json({ error: "INVALID_INPUT", message: "Dados inválidos." }, 400);
      const { data: existing } = await client.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
      if (!existing) return json({ error: "NOT_FOUND", message: "Agendamento não encontrado." }, 404);
      if (!["cancelled", "no_show"].includes(existing.status)) {
        return json({ error: "NOT_ALLOWED", message: "Só é possível excluir agendamentos cancelados ou com ausência." }, 409);
      }
      const { error: delErr } = await client.from("appointments").delete().eq("id", appointmentId);
      if (delErr) return json({ error: "DELETE_FAILED", message: "Não foi possível excluir." }, 500);
      await recordEvent(client, {
        appointment_id: appointmentId, event_type: "deleted", before_data: existing, after_data: null,
        actor: "admin", idempotency_key: `delete:${appointmentId}`,
      });
      return json({ ok: true });
    }

    if (action === "remove_product") {
      const productRowId = String(body.appointment_product_id || "");
      const idempotencyKey = body.idempotency_key ? String(body.idempotency_key).slice(0, 100) : null;
      if (!productRowId) return json({ error: "INVALID_INPUT", message: "Adicional inválido." }, 400);

      const { data: row } = await client.from("appointment_products").select("*").eq("id", productRowId).maybeSingle();
      if (!row) return json({ error: "NOT_FOUND", message: "Adicional não encontrado." }, 404);
      if (row.status === "removed") return json({ ok: true, already_removed: true });

      const { data: appt } = await client.from("appointments").select("id, service_price_snapshot, service_duration_snapshot, start_at, end_at").eq("id", row.appointment_id).maybeSingle();
      if (!appt) return json({ error: "APPOINTMENT_NOT_FOUND", message: "Agendamento não encontrado." }, 404);

      // Financial guard: never let confirmed payments exceed the new due amount.
      const { data: reservedRows } = await client.from("appointment_products")
        .select("product_price_snapshot, quantity").eq("appointment_id", row.appointment_id).eq("status", "reserved");
      const productsDue = (reservedRows || []).reduce((s: number, r: any) => s + Number(r.product_price_snapshot) * Number(r.quantity), 0);
      const currentDue = (Number(appt.service_price_snapshot) || 0) + productsDue;
      const removeValue = Number(row.product_price_snapshot) * Number(row.quantity);
      const newDue = Math.max(0, Math.round((currentDue - removeValue) * 100) / 100);

      const { data: paidRows } = await client.from("cash_entries")
        .select("amount").eq("type", "income").eq("appointment_id", row.appointment_id);
      const paid = (paidRows || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
      if (paid > newDue + 0.001) {
        return json(
          { error: "PAYMENT_EXISTS", message: "Já existe pagamento registrado igual ou maior que o novo valor devido. Ajuste o caixa antes de remover este adicional." },
          409,
        );
      }

      const { data: updated, error: updErr } = await client.from("appointment_products")
        .update({ status: "removed", updated_at: new Date().toISOString() }).eq("id", productRowId).select("*").single();
      if (updErr) return json({ error: "UPDATE_FAILED", message: "Não foi possível remover o adicional." }, 500);

      // If the removed item was a time-consuming service, free its duration on
      // the appointment so availability reflects reality (shrinking never
      // creates conflicts with other bookings).
      const freedDuration = Number(row.duration_minutes_snapshot) || 0;
      if (freedDuration > 0) {
        const newDuration = Math.max(0, (Number(appt.service_duration_snapshot) || 0) - freedDuration);
        const newEnd = new Date(new Date(appt.start_at).getTime() + newDuration * 60000);
        await client.from("appointments")
          .update({ end_at: newEnd.toISOString(), service_duration_snapshot: newDuration, updated_at: new Date().toISOString() })
          .eq("id", row.appointment_id);
      }

      await recordEvent(client, {
        appointment_id: row.appointment_id, event_type: "product_removed", before_data: row, after_data: updated,
        actor: "admin", idempotency_key: idempotencyKey || `product-remove:${productRowId}`,
      });
      return json({ ok: true, product: updated });
    }

    return json({ error: "UNKNOWN_ACTION", message: "Ação não suportada." }, 400);
  } catch (e) {
    return json({ error: "SERVER_ERROR", message: String(e) }, 500);
  }
});
