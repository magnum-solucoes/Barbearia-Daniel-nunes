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

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Resolves the correct weekday price for a service (promo rules live on the server). */
function resolvePrice(service: any, weekday: number) {
  const promoWeekdays = Array.isArray(service.promo_weekdays) ? service.promo_weekdays : [];
  const hasPromo =
    Boolean(service.promo_enabled) && service.promo_price != null && promoWeekdays.includes(weekday);
  if (hasPromo) {
    const promo = Number(service.promo_price);
    const base = Number(service.price);
    return { price: promo, applied: true, list: !service.promo_only && base > promo ? base : null, available: true };
  }
  if (service.promo_only) {
    return { price: 0, applied: false, list: null, available: false };
  }
  return { price: Number(service.price), applied: false, list: null, available: true };
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
    const serviceId = body.service_id as string | undefined;
    const date = body.date as string | undefined;
    const addonRaw = Number(body.addon_minutes ?? 0);
    const addonMinutes = Number.isFinite(addonRaw) ? Math.min(Math.max(Math.floor(addonRaw), 0), 240) : 0;

    if (!serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "INVALID_INPUT", message: "service_id e date (YYYY-MM-DD) são obrigatórios." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) {
      return json({ error: "SERVER_MISCONFIG" }, 500);
    }
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: settings } = await supabase
      .from("settings")
      .select("timezone, booking_enabled, min_advance_minutes")
      .eq("id", 1)
      .maybeSingle();

    const timeZone = settings?.timezone || DEFAULT_TZ;
    const bookingEnabled = settings?.booking_enabled ?? false;
    const minAdvance = settings?.min_advance_minutes ?? 15;

    const { data: service } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes, active, promo_enabled, promo_price, promo_weekdays, promo_only, participants_count")
      .eq("id", serviceId)
      .maybeSingle();

    if (!service || !service.active) {
      return json({ error: "SERVICE_UNAVAILABLE", message: "Serviço indisponível." }, 404);
    }

    const duration = Number(service.duration_minutes) || 0;
    // Additional services (eyebrow shaping, etc.) extend the required slot.
    const totalDuration = duration + addonMinutes;
    const today = dateInTz(new Date(), timeZone);
    const maxDate = addDays(today, MAX_ADVANCE_DAYS, timeZone);
    const weekday = weekdayOf(date, timeZone);

    const resolved = resolvePrice(service, weekday);

    const base = {
      booking_enabled: bookingEnabled,
      timezone: timeZone,
      date,
      service: {
        id: service.id,
        name: service.name,
        price: resolved.price,
        base_price: Number(service.price),
        list_price: resolved.list,
        duration_minutes: totalDuration,
        participants_count: Number(service.participants_count) || 1,
        promo_applied: resolved.applied,
        promo_price: service.promo_enabled ? Number(service.promo_price) : null,
        promo_weekdays: Array.isArray(service.promo_weekdays) ? service.promo_weekdays : [],
        promo_only: Boolean(service.promo_only),
        promo_available: resolved.available,
      },
      min_date: today,
      max_date: maxDate,
      step_minutes: STEP_MINUTES,
      addon_minutes: addonMinutes,
    };

    if (date < today || date > maxDate) {
      return json({ ...base, closed: true, reason: "OUT_OF_WINDOW", slots: [] });
    }

    // Promo-only services (e.g. the combo) cannot be booked outside their promo weekdays.
    if (!resolved.available) {
      return json({ ...base, closed: true, reason: "PROMO_ONLY", slots: [] });
    }

    const { data: hours } = await supabase
      .from("business_hours")
      .select("*")
      .eq("weekday", weekday)
      .maybeSingle();

    if (!hours || !hours.is_open || !hours.open_time || !hours.close_time) {
      return json({ ...base, closed: true, reason: "WEEKDAY_CLOSED", slots: [] });
    }

    const openMin = parseTime(hours.open_time)!;
    const closeMin = parseTime(hours.close_time)!;
    const breakStart = parseTime(hours.break_start);
    const breakEnd = parseTime(hours.break_end);

    const { data: blocks } = await supabase
      .from("blocked_slots")
      .select("start_time, end_time")
      .eq("block_date", date);

    let dayBlocked = false;
    const blockRanges: Array<[number, number]> = [];
    for (const b of blocks || []) {
      if (!b.start_time && !b.end_time) {
        dayBlocked = true;
        break;
      }
      const bs = b.start_time ? parseTime(b.start_time)! : openMin;
      const be = b.end_time ? parseTime(b.end_time)! : closeMin;
      if (bs < be) blockRanges.push([bs, be]);
    }
    if (dayBlocked) {
      return json({ ...base, closed: true, reason: "DAY_BLOCKED", slots: [] });
    }

    const dayStartUtc = localToUtc(date, "00:00", timeZone);
    const dayEndUtc = new Date(dayStartUtc.getTime() + 86400000);

    const { data: appts } = await supabase
      .from("appointments")
      .select("start_at, end_at")
      .neq("status", "cancelled")
      .lt("start_at", dayEndUtc.toISOString())
      .gt("end_at", dayStartUtc.toISOString());

    const busy: Array<[number, number]> = [];
    for (const a of appts || []) {
      const s = new Date(a.start_at).getTime();
      const e = new Date(a.end_at).getTime();
      const sLocal = Math.round((s - dayStartUtc.getTime()) / 60000);
      const eLocal = Math.round((e - dayStartUtc.getTime()) / 60000);
      busy.push([sLocal, eLocal]);
    }

    const minStart = new Date(Date.now() + minAdvance * 60000);
    const slots: string[] = [];
    const lastStart = closeMin - totalDuration;

    for (let start = openMin; start <= lastStart; start += STEP_MINUTES) {
      const end = start + totalDuration;

      if (breakStart !== null && breakEnd !== null && overlaps(start, end, breakStart, breakEnd)) {
        continue;
      }

      let blocked = false;
      for (const [bs, be] of blockRanges) {
        if (overlaps(start, end, bs, be)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      let taken = false;
      for (const [bs, be] of busy) {
        if (overlaps(start, end, bs, be)) {
          taken = true;
          break;
        }
      }
      if (taken) continue;

      const slotStartUtc = localToUtc(date, minutesToHHMM(start), timeZone);
      if (slotStartUtc.getTime() < minStart.getTime()) continue;

      slots.push(minutesToHHMM(start));
    }

    return json({ ...base, closed: false, reason: null, slots });
  } catch (e) {
    return json({ error: "SERVER_ERROR", message: String(e) }, 500);
  }
});
