import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STEP_MINUTES = 15;
const MAX_ADVANCE_DAYS = 35;
const DEFAULT_TZ = "America/Campo_Grande";
const MAX_NOTES = 500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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

function dateInTz(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function addDays(dateStr: string, days: number, timeZone: string): string {
  const instant = localToUtc(dateStr, "12:00", timeZone);
  const next = new Date(instant.getTime() + days * 86400000);
  return dateInTz(next, timeZone);
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

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Resolves the correct weekday price for a service (never trusts the browser). */
function resolvePrice(service: any, weekday: number) {
  const promoWeekdays = Array.isArray(service.promo_weekdays) ? service.promo_weekdays : [];
  const hasPromo =
    Boolean(service.promo_enabled) && service.promo_price != null && promoWeekdays.includes(weekday);
  if (hasPromo) return { price: Number(service.promo_price), applied: true, available: true };
  if (service.promo_only) return { price: 0, applied: false, available: false };
  return { price: Number(service.price), applied: false, available: true };
}

function productResponse(rows: any[]) {
  return (rows || []).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    name: r.product_name_snapshot,
    price: Number(r.product_price_snapshot),
    quantity: Number(r.quantity),
    status: r.status,
  }));
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return {};
  } catch (err) {
    return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await readJson(req);
    const serviceId = typeof body.service_id === "string" ? body.service_id : "";
    const date = typeof body.date === "string" ? body.date : "";
    const time = typeof body.time === "string" ? body.time : "";
    const clientName = String(body.client_name ?? "").trim();
    const clientPhoneRaw = String(body.client_phone ?? "");
    const clientPhone = clientPhoneRaw.replace(/\D/g, "");
    const notes = body.notes ? String(body.notes).slice(0, MAX_NOTES) : null;
    const clientIdempotencyKey =
      typeof body.idempotency_key === "string" && body.idempotency_key.length > 0
        ? body.idempotency_key.slice(0, 100)
        : null;
    const rawProducts = Array.isArray(body.products) ? (body.products as unknown[]) : [];
    const rawParticipants = Array.isArray(body.participants)
      ? (body.participants as unknown[]).map((p) => String(p ?? "").trim())
      : [];

    if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return json({ error: "INVALID_INPUT", message: "Dados do agendamento incompletos." }, 400);
    }
    if (clientName.length < 2 || clientName.length > 80) {
      return json({ error: "INVALID_NAME", message: "Informe seu nome completo." }, 400);
    }
    if (clientPhone.length < 10 || clientPhone.length > 13) {
      return json({ error: "INVALID_PHONE", message: "Informe um WhatsApp válido com DDD." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      return json({ error: "SERVER_MISCONFIG" }, 500);
    }
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: settings } = await supabase
      .from("settings")
      .select("timezone, booking_enabled, min_advance_minutes, business_name, address, whatsapp")
      .eq("id", 1)
      .maybeSingle();

    if (!settings?.booking_enabled) {
      return json(
        {
          error: "BOOKING_DISABLED",
          message: "A agenda online está desativada no momento. Fale com a barbearia pelo WhatsApp.",
        },
        409,
      );
    }

    const timeZone = settings.timezone || DEFAULT_TZ;
    const minAdvance = settings.min_advance_minutes ?? 15;

    const { data: service } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes, active, promo_enabled, promo_price, promo_weekdays, promo_only, participants_count")
      .eq("id", serviceId)
      .maybeSingle();

    if (!service || !service.active) {
      return json({ error: "SERVICE_UNAVAILABLE", message: "Serviço indisponível." }, 404);
    }

    const duration = Number(service.duration_minutes) || 0;
    if (duration <= 0) {
      return json({ error: "SERVICE_UNAVAILABLE", message: "Serviço sem duração válida." }, 400);
    }

    // Two-person packages (Pai e Filho / Dois Irmãos) require every participant
    // name. The count is defined by the service on the server, never the browser.
    const participantsCount = Number(service.participants_count) || 1;
    let participantNames: string[] = [];
    if (participantsCount > 1) {
      const clean = rawParticipants.filter((n) => n.length > 0);
      if (clean.length < participantsCount) {
        return json({ error: "INVALID_PARTICIPANTS", message: "Informe o nome de todos os participantes do pacote." }, 400);
      }
      participantNames = clean.slice(0, participantsCount);
      for (const n of participantNames) {
        if (n.length < 2 || n.length > 80) {
          return json({ error: "INVALID_PARTICIPANTS", message: "Informe um nome válido para cada participante." }, 400);
        }
      }
    }

    // Optional upsell products. Prices are always resolved on the server — the
    // browser only sends product ids and quantities, never monetary values.
    const productPlan: { id: string; name: string; price: number; quantity: number; duration_minutes: number }[] = [];
    {
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

      if (selections.length > 0) {
        const ids = selections.map((s) => s.product_id);
        const { data: found } = await supabase
          .from("booking_products")
          .select("id, name, price, max_quantity, active, kind, duration_minutes")
          .in("id", ids);
        const catalog = (found || []) as {
          id: string; name: string; price: number; max_quantity: number; active: boolean;
          kind: string; duration_minutes: number;
        }[];
        for (const sel of selections) {
          const match = catalog.find((p) => p.id === sel.product_id);
          if (!match || !match.active) {
            return json(
              { error: "PRODUCT_UNAVAILABLE", message: "Um dos produtos selecionados não está mais disponível." },
              409,
            );
          }
          const maxQ = Number(match.max_quantity) || 1;
          if (sel.quantity < 1 || sel.quantity > maxQ) {
            return json({ error: "INVALID_QUANTITY", message: "Quantidade de produto inválida para este item." }, 400);
          }
          productPlan.push({ id: match.id, name: match.name, price: Number(match.price), quantity: sel.quantity, duration_minutes: Number(match.duration_minutes) || 0 });
        }
      }
    }
    const productsTotal = productPlan.reduce((sum, p) => sum + p.price * p.quantity, 0);
    // Additional services (e.g. eyebrow shaping) extend the appointment duration;
    // physical products add no time. Resolved on the server, never from the browser.
    const addonMinutes = productPlan.reduce((sum, p) => sum + p.duration_minutes * p.quantity, 0);
    const totalDuration = duration + addonMinutes;

    const today = dateInTz(new Date(), timeZone);
    const maxDate = addDays(today, MAX_ADVANCE_DAYS, timeZone);

    if (date < today) {
      return json({ error: "DATE_IN_PAST", message: "Não é possível agendar em datas passadas." }, 400);
    }
    if (date > maxDate) {
      return json(
        { error: "OUT_OF_WINDOW", message: `Agendamentos são permitidos até ${MAX_ADVANCE_DAYS} dias à frente.` },
        400,
      );
    }

    const startUtc = localToUtc(date, time, timeZone);
    const endUtc = new Date(startUtc.getTime() + totalDuration * 60000);

    if (startUtc.getTime() < Date.now() + minAdvance * 60000) {
      return json(
        { error: "TOO_SOON", message: `É necessária uma antecedência mínima de ${minAdvance} minutos.` },
        400,
      );
    }

    const weekday = weekdayOf(date, timeZone);

    // Weekday pricing: the combo is only bookable on its promo days, and the
    // promotional price is resolved on the server for the appointment date.
    const resolvedService = resolvePrice(service, weekday);
    if (!resolvedService.available) {
      return json(
        { error: "PROMO_ONLY", message: "Este serviço só está disponível nos dias da promoção. Escolha segunda, terça ou quarta." },
        409,
      );
    }

    const { data: hours } = await supabase
      .from("business_hours")
      .select("*")
      .eq("weekday", weekday)
      .maybeSingle();

    if (!hours || !hours.is_open || !hours.open_time || !hours.close_time) {
      return json({ error: "CLOSED", message: "A barbearia está fechada nesse dia." }, 409);
    }

    const dayStartUtc = localToUtc(date, "00:00", timeZone);
    const startMin = Math.round((startUtc.getTime() - dayStartUtc.getTime()) / 60000);
    const endMin = startMin + totalDuration;
    const openMin = parseTime(hours.open_time)!;
    const closeMin = parseTime(hours.close_time)!;
    const breakStart = parseTime(hours.break_start);
    const breakEnd = parseTime(hours.break_end);

    if (startMin < openMin || endMin > closeMin) {
      return json({ error: "OUT_OF_HOURS", message: "Horário fora do funcionamento." }, 409);
    }
    if (breakStart !== null && breakEnd !== null && overlaps(startMin, endMin, breakStart, breakEnd)) {
      return json({ error: "ON_BREAK", message: "Horário coincide com uma pausa." }, 409);
    }

    const { data: blocks } = await supabase
      .from("blocked_slots")
      .select("start_time, end_time")
      .eq("block_date", date);

    for (const b of blocks || []) {
      if (!b.start_time && !b.end_time) {
        return json({ error: "DAY_BLOCKED", message: "Este dia está bloqueado." }, 409);
      }
      const bs = b.start_time ? parseTime(b.start_time)! : openMin;
      const be = b.end_time ? parseTime(b.end_time)! : closeMin;
      if (bs < be && overlaps(startMin, endMin, bs, be)) {
        return json({ error: "BLOCKED", message: "Este horário está bloqueado." }, 409);
      }
    }

    // Idempotência: se o mesmo pedido já foi criado, devolve o existente.
    if (clientIdempotencyKey) {
      const idemKey = `create:${clientIdempotencyKey}`;
      const { data: existingEvent } = await supabase
        .from("appointment_events")
        .select("appointment_id")
        .eq("idempotency_key", idemKey)
        .maybeSingle();
      if (existingEvent?.appointment_id) {
        const { data: existing } = await supabase
          .from("appointments")
          .select("*")
          .eq("id", existingEvent.appointment_id)
          .maybeSingle();
        if (existing) {
          const { data: existingProducts } = await supabase
            .from("appointment_products")
            .select("*")
            .eq("appointment_id", existing.id)
            .eq("status", "reserved");
          const existingProductsTotal = (existingProducts || []).reduce(
            (sum: number, r: any) => sum + Number(r.product_price_snapshot) * Number(r.quantity),
            0,
          );
          return json({
            ok: true,
            duplicate: true,
            appointment: {
              id: existing.id,
              client_name: existing.client_name,
              service_name: existing.service_name_snapshot,
              price: Number(existing.service_price_snapshot),
              duration_minutes: existing.service_duration_snapshot,
              start_at: existing.start_at,
              end_at: existing.end_at,
              date,
              time,
              status: existing.status,
              participants: (existing.participant_names as string[]) || [],
              products: productResponse(existingProducts || []),
              products_total: existingProductsTotal,
              total: Number(existing.service_price_snapshot) + existingProductsTotal,
            },
            business: {
              name: settings.business_name,
              address: settings.address,
              whatsapp: settings.whatsapp,
            },
          });
        }
      }
    }

    // Proteção leve contra envios repetidos/abusivos do mesmo número.
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentCount } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_phone", clientPhone)
      .gte("created_at", oneMinuteAgo);
    if ((recentCount ?? 0) >= 5) {
      return json(
        { error: "TOO_MANY_REQUESTS", message: "Muitas tentativas seguidas. Aguarde um instante e tente novamente." },
        429,
      );
    }

    const { data: created, error: insertError } = await supabase
      .from("appointments")
      .insert({
        service_id: service.id,
        service_name_snapshot: service.name,
        service_price_snapshot: resolvedService.price,
        service_duration_snapshot: totalDuration,
        client_name: clientName,
        client_phone: clientPhone,
        start_at: startUtc.toISOString(),
        end_at: endUtc.toISOString(),
        status: "pending",
        notes,
        participant_names: participantNames,
      })
      .select("*")
      .single();

    if (insertError) {
      if (insertError.code === "23P01") {
        return json(
          { error: "SLOT_TAKEN", message: "Ops! Esse horário acabou de ser reservado. Escolha outro." },
          409,
        );
      }
      return json({ error: "INSERT_FAILED", message: "Não foi possível concluir a reserva. Tente novamente." }, 500);
    }

    if (productPlan.length > 0) {
      const { error: prodErr } = await supabase.from("appointment_products").insert(
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
        // Rollback: never leave a booking with a partially registered upsell.
        await supabase.from("appointments").delete().eq("id", created.id);
        return json(
          { error: "PRODUCT_INSERT_FAILED", message: "Não foi possível registrar os produtos da reserva. Tente novamente." },
          500,
        );
      }
    }

    const afterData = {
      id: created.id,
      service_name: created.service_name_snapshot,
      service_price: Number(created.service_price_snapshot),
      service_duration: created.service_duration_snapshot,
      client_name: created.client_name,
      client_phone: created.client_phone,
      start_at: created.start_at,
      end_at: created.end_at,
      status: created.status,
      participants: participantNames,
      products: productPlan.map((p) => ({ product_id: p.id, name: p.name, price: p.price, quantity: p.quantity, duration_minutes: p.duration_minutes })),
    };
    const eventKey = clientIdempotencyKey ? `create:${clientIdempotencyKey}` : `created:${created.id}`;
    const eventPayload = {
      appointment_id: created.id,
      event_type: "created",
      before_data: null,
      after_data: afterData,
      actor: "client",
      idempotency_key: eventKey,
    };

    try {
      const { error: eventError } = await supabase.from("appointment_events").insert(eventPayload);
      if (eventError && eventError.code !== "23505") {
        await supabase.from("appointment_event_outbox").insert({ payload: eventPayload, status: "pending" });
      }
    } catch (eventCatch) {
      try {
        await supabase.from("appointment_event_outbox").insert({ payload: eventPayload, status: "pending" });
      } catch (outboxErr) {
        // silencioso: a reserva já foi criada
      }
    }

    return json({
      ok: true,
      appointment: {
        id: created.id,
        client_name: created.client_name,
        service_name: created.service_name_snapshot,
        price: Number(created.service_price_snapshot),
        duration_minutes: created.service_duration_snapshot,
        start_at: created.start_at,
        end_at: created.end_at,
        date,
        time,
        status: created.status,
        participants: participantNames,
        products: productPlan.map((p) => ({
          product_id: p.id,
          name: p.name,
          price: p.price,
          quantity: p.quantity,
          status: "reserved",
          duration_minutes: p.duration_minutes,
        })),
        products_total: productsTotal,
        total: Number(created.service_price_snapshot) + productsTotal,
      },
      business: {
        name: settings.business_name,
        address: settings.address,
        whatsapp: settings.whatsapp,
      },
    });
  } catch (e) {
    return json({ error: "SERVER_ERROR", message: String(e) }, 500);
  }
});
