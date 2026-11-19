import { supabase } from '@/lib/supabase';

export const DEFAULT_TZ = 'America/Campo_Grande';
export const STEP_MINUTES = 15;
export const MAX_ADVANCE_DAYS = 35;

export interface AvailabilityService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  participants_count?: number;
  base_price?: number;
  list_price?: number | null;
  promo_applied?: boolean;
  promo_price?: number | null;
  promo_weekdays?: number[];
  promo_only?: boolean;
  promo_available?: boolean;
}

export interface AvailabilityResult {
  booking_enabled: boolean;
  timezone: string;
  date: string;
  service?: AvailabilityService;
  min_date?: string;
  max_date?: string;
  step_minutes?: number;
  addon_minutes?: number;
  closed: boolean;
  reason: string | null;
  slots: string[];
}

export interface BookingProductLine {
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  status?: string;
  /** 'product' or 'service' — services add time to the appointment. */
  kind?: 'product' | 'service';
  duration_minutes?: number;
}

export interface BookingConfirmation {
  id: string;
  client_name: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  date: string;
  time: string;
  status: string;
  participants?: string[];
  products?: BookingProductLine[];
  products_total?: number;
  total?: number;
}

export interface BookingBusiness {
  name: string | null;
  address: string | null;
  whatsapp: string | null;
}

export type CreateBookingResult =
  | { ok: true; appointment: BookingConfirmation; business: BookingBusiness }
  | { ok: false; code: string; message: string };

/* ---------------- Timezone helpers (client side) ---------------- */

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = map.hour === '24' ? '0' : map.hour;
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +hour, +map.minute, +map.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** Turns a local (tz) date+time into a real instant. */
function localToInstant(dateStr: string, hh: number, mm: number, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, 0);
  const offset = tzOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60000);
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function todayInTz(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(dateStr: string, days: number, timeZone: string): string {
  const instant = localToInstant(dateStr, 12, 0, timeZone);
  const next = new Date(instant.getTime() + days * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(next);
}

export function weekdayOf(dateStr: string, timeZone: string): number {
  const instant = localToInstant(dateStr, 12, 0, timeZone);
  const wd = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(instant);
  return WEEKDAY_INDEX[wd] ?? 0;
}

export function formatLongDate(dateStr: string, timeZone: string): string {
  const instant = localToInstant(dateStr, 12, 0, timeZone);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(instant);
}

export function formatFullDateTime(dateStr: string, time: string, timeZone: string): string {
  const [hh, mm] = time.split(':').map(Number);
  const instant = localToInstant(dateStr, hh || 0, mm || 0, timeZone);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(instant);
}

export function dayNumber(dateStr: string): string {
  return dateStr.slice(8, 10);
}

/* ---------------- Weekday promo pricing (client mirror of server rules) ---------------- */

export interface ResolvedPrice {
  /** Price to charge for the selected date. */
  price: number;
  /** True when the promotional price is being applied for that weekday. */
  applied: boolean;
  /** Base (non-promo) price to display as "De", when it exists and is higher. */
  listPrice: number | null;
  /** False when the service cannot be booked on the selected date (promo-only). */
  available: boolean;
  /** Weekdays (0=Sun..6=Sat) in which this service has a promotion. */
  promoWeekdays: number[];
}

/** Resolves the correct price for a service on a given appointment date. */
export function resolveServicePrice(
  service: {
    price: number;
    promo_enabled?: boolean;
    promo_price?: number | null;
    promo_weekdays?: number[] | null;
    promo_only?: boolean;
  },
  dateStr: string,
  timeZone: string,
): ResolvedPrice {
  const weekday = weekdayOf(dateStr, timeZone);
  const promoWeekdays = service.promo_weekdays || [];
  const hasPromo =
    Boolean(service.promo_enabled) &&
    service.promo_price != null &&
    promoWeekdays.includes(weekday);

  if (hasPromo) {
    const promo = Number(service.promo_price);
    const base = Number(service.price);
    const listPrice = !service.promo_only && base > promo ? base : null;
    return { price: promo, applied: true, listPrice, available: true, promoWeekdays };
  }

  if (service.promo_only) {
    return { price: 0, applied: false, listPrice: null, available: false, promoWeekdays };
  }

  return { price: Number(service.price), applied: false, listPrice: null, available: true, promoWeekdays };
}

/** Human label for the promo weekdays, e.g. "segunda a quarta". */
export function promoWeekdaysLabel(weekdays: number[] | null | undefined): string {
  const list = (weekdays || []).slice().sort((a, b) => a - b);
  if (list.length === 0) return '';
  const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  if (list.length === 1) return names[list[0]];
  return `${names[list[0]]} a ${names[list[list.length - 1]]}`;
}

export function monthShort(dateStr: string, timeZone: string): string {
  const instant = localToInstant(dateStr, 12, 0, timeZone);
  return new Intl.DateTimeFormat('pt-BR', { timeZone, month: 'short' })
    .format(instant)
    .replace('.', '');
}

/** Builds the list of dates from today until the booking window limit. */
export function buildWindowDates(timeZone: string, days = MAX_ADVANCE_DAYS): string[] {
  const start = todayInTz(timeZone);
  const list: string[] = [];
  for (let i = 0; i <= days; i += 1) {
    list.push(addDays(start, i, timeZone));
  }
  return list;
}

/* ---------------- Edge function calls ---------------- */

export async function fetchAvailability(
  serviceId: string,
  date: string,
  addonMinutes = 0,
): Promise<{ ok: true; data: AvailabilityResult } | { ok: false; message: string }> {
  const { data, error } = await supabase.functions.invoke('booking-availability', {
    body: { service_id: serviceId, date, addon_minutes: addonMinutes },
  });

  if (error) {
    let message = 'Não foi possível consultar os horários. Tente novamente.';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = await ctx.json();
        if (parsed?.message) message = parsed.message;
      }
    } catch {
      /* keep default message */
    }
    return { ok: false, message };
  }

  if (!data || (data as { error?: string }).error) {
    return { ok: false, message: 'Não foi possível consultar os horários.' };
  }

  return { ok: true, data: data as AvailabilityResult };
}

export interface CreateBookingInput {
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
  idempotencyKey?: string;
  products?: { product_id: string; quantity: number }[];
  /** Participant names for two-person packages. */
  participants?: string[];
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const { data, error } = await supabase.functions.invoke('booking-create', {
    body: {
      service_id: input.serviceId,
      date: input.date,
      time: input.time,
      client_name: input.clientName,
      client_phone: input.clientPhone,
      notes: input.notes || null,
      idempotency_key: input.idempotencyKey || null,
      products: input.products || [],
      participants: input.participants || [],
    },
  });

  if (error) {
    let message = 'Não foi possível concluir o agendamento. Tente novamente.';
    let code = 'UNKNOWN';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = await ctx.json();
        if (parsed?.message) message = parsed.message;
        if (parsed?.error) code = parsed.error;
      }
    } catch {
      /* keep defaults */
    }
    return { ok: false, code, message };
  }

  if (!data || (data as { error?: string }).error) {
    const payload = data as { error?: string; message?: string } | null;
    return {
      ok: false,
      code: payload?.error || 'UNKNOWN',
      message: payload?.message || 'Não foi possível concluir o agendamento.',
    };
  }

  return {
    ok: true,
    appointment: (data as { appointment: BookingConfirmation }).appointment,
    business: (data as { business: BookingBusiness }).business,
  };
}

export function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* ---------------- Instant (UTC ISO) formatters for admin ---------------- */

export function instantDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(iso));
}

export function instantTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

export function instantFull(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function instantLongDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone, weekday: 'long', day: '2-digit', month: 'long',
  }).format(new Date(iso));
}

export function instantWeekdayShort(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'short' })
    .format(new Date(iso))
    .replace('.', '');
}