import { supabase } from '@/lib/supabase';
import type { Appointment } from '@/types/barber';

/* ------------------------------------------------------------------ */
/* Admin identity                                                      */
/* ------------------------------------------------------------------ */

/** True only when the authenticated user's id exists in admin_users. */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Edge function call helpers                                          */
/* ------------------------------------------------------------------ */

export type AdminResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

async function extractError(error: unknown, fallback: string): Promise<{ code: string; message: string }> {
  let code = 'UNKNOWN';
  let message = fallback;
  try {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const parsed = await ctx.json();
      if (parsed?.message) message = parsed.message;
      if (parsed?.error) code = parsed.error;
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }
  } catch {
    /* keep fallback */
  }
  return { code, message };
}

async function invokeAdmin<T>(
  fn: 'admin-booking' | 'admin-cash',
  payload: Record<string, unknown>,
  fallback: string,
): Promise<AdminResult<T>> {
  const { data, error } = await supabase.functions.invoke(fn, { body: payload });

  if (error) {
    const parsed = await extractError(error, fallback);
    return { ok: false, code: parsed.code, message: parsed.message };
  }
  if (!data || (data as { error?: string }).error) {
    const payloadErr = data as { error?: string; message?: string } | null;
    return {
      ok: false,
      code: payloadErr?.error || 'UNKNOWN',
      message: payloadErr?.message || fallback,
    };
  }
  return { ok: true, data: data as T };
}

/* ------------------------------------------------------------------ */
/* admin-booking                                                       */
/* ------------------------------------------------------------------ */

export interface AdminAvailability {
  closed: boolean;
  reason: string | null;
  slots: string[];
  timezone: string;
  date: string;
}

export function adminAvailability(serviceId: string, date: string, excludeId?: string | null) {
  return invokeAdmin<AdminAvailability>(
    'admin-booking',
    { action: 'availability', service_id: serviceId, date, exclude_id: excludeId ?? null },
    'Não foi possível consultar os horários.',
  );
}

export interface ManualBookingInput {
  serviceId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  notes?: string;
  status?: string;
  products?: { product_id: string; quantity: number }[];
  /** Participant names for two-person packages. */
  participants?: string[];
}

export function adminCreateBooking(input: ManualBookingInput) {
  return invokeAdmin<{ appointment: Appointment }>(
    'admin-booking',
    {
      action: 'create',
      service_id: input.serviceId,
      date: input.date,
      time: input.time,
      client_name: input.clientName,
      client_phone: input.clientPhone,
      notes: input.notes || null,
      status: input.status || 'pending',
      products: input.products || [],
      participants: input.participants || [],
    },
    'Não foi possível criar o agendamento.',
  );
}

/** Removes a reserved upsell product from an appointment (soft-remove, keeps history). */
export function adminRemoveAppointmentProduct(appointmentProductId: string, idempotencyKey?: string) {
  return invokeAdmin<Record<string, never>>(
    'admin-booking',
    {
      action: 'remove_product',
      appointment_product_id: appointmentProductId,
      idempotency_key: idempotencyKey || null,
    },
    'Não foi possível remover o adicional.',
  );
}

export function adminSetStatus(appointmentId: string, status: string, idempotencyKey?: string) {
  return invokeAdmin<{ appointment: Appointment }>(
    'admin-booking',
    { action: 'set_status', appointment_id: appointmentId, status, idempotency_key: idempotencyKey || null },
    'Não foi possível atualizar o status.',
  );
}

export interface RescheduleResult {
  appointment: Appointment;
  previous: { start_at: string; end_at: string };
}

export function adminReschedule(
  appointmentId: string,
  date: string,
  time: string,
  idempotencyKey?: string,
) {
  return invokeAdmin<RescheduleResult>(
    'admin-booking',
    { action: 'reschedule', appointment_id: appointmentId, date, time, idempotency_key: idempotencyKey || null },
    'Não foi possível remarcar o agendamento.',
  );
}

export function adminDeleteAppointment(appointmentId: string) {
  return invokeAdmin<Record<string, never>>(
    'admin-booking',
    { action: 'delete', appointment_id: appointmentId },
    'Não foi possível excluir o agendamento.',
  );
}

/* ------------------------------------------------------------------ */
/* admin-cash                                                          */
/* ------------------------------------------------------------------ */

export interface CashEntryInput {
  type: 'income' | 'expense';
  amount: number;
  method?: string | null;
  appointmentId?: string | null;
  description?: string | null;
  entryDate?: string | null;
}

export function adminAddCashEntry(input: CashEntryInput) {
  return invokeAdmin<{ entry: { id: string } }>(
    'admin-cash',
    {
      action: 'add_entry',
      type: input.type,
      amount: input.amount,
      method: input.method ?? null,
      appointment_id: input.appointmentId ?? null,
      description: input.description ?? null,
      entry_date: input.entryDate ?? null,
    },
    'Não foi possível registrar o lançamento.',
  );
}

export function adminDeleteCashEntry(id: string) {
  return invokeAdmin<Record<string, never>>(
    'admin-cash',
    { action: 'delete_entry', id },
    'Não foi possível excluir o lançamento.',
  );
}

/* ------------------------------------------------------------------ */
/* First-admin bootstrap                                               */
/* ------------------------------------------------------------------ */

/**
 * Asks the backend whether an administrator already exists.
 * On any uncertainty we default to `configured: true` so the setup form is
 * never exposed by mistake.
 */
export async function fetchSetupStatus(): Promise<{ ok: boolean; configured: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-setup-status', { body: {} });
    if (error) return { ok: false, configured: true };
    const payload = data as { configured?: boolean } | null;
    return { ok: true, configured: Boolean(payload?.configured) };
  } catch {
    return { ok: false, configured: true };
  }
}

export interface BootstrapInput {
  token: string;
  email: string;
  password: string;
}

/**
 * Runs the one-time first-owner bootstrap. The secret token is validated on
 * the server; the browser never stores it.
 */
export async function runBootstrap(input: BootstrapInput): Promise<AdminResult<{ message: string }>> {
  const { data, error } = await supabase.functions.invoke('admin-setup', {
    body: { token: input.token, email: input.email, password: input.password },
  });

  if (error) {
    const parsed = await extractError(error, 'Não foi possível concluir a configuração.');
    return { ok: false, code: parsed.code, message: parsed.message };
  }

  const payload = data as { error?: string; message?: string } | null;
  if (!data || payload?.error) {
    return {
      ok: false,
      code: payload?.error || 'UNKNOWN',
      message: payload?.message || 'Não foi possível concluir a configuração.',
    };
  }
  return { ok: true, data: { message: payload?.message || 'Configuração concluída.' } };
}