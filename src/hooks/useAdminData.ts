import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentEvent, AppointmentProduct, BlockedSlot, BookingProduct, CashEntry, Service } from '@/types/barber';

function useLoader<T>(table: string, orderBy: string, ascending: boolean, message: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from(table).select('*').order(orderBy, { ascending });
      if (err) throw err;
      setItems((data as T[]) || []);
    } catch {
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [table, orderBy, ascending, message]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}

export function useAdminAppointments() {
  const { items, loading, error, reload } = useLoader<Appointment>(
    'appointments',
    'start_at',
    true,
    'Não foi possível carregar os agendamentos.',
  );
  return { appointments: items, loading, error, reload };
}

export function useAdminServices() {
  const { items, loading, error, reload } = useLoader<Service>(
    'services',
    'sort_order',
    true,
    'Não foi possível carregar os serviços.',
  );
  return { services: items, loading, error, reload };
}

export function useAdminProducts() {
  const { items, loading, error, reload } = useLoader<BookingProduct>(
    'booking_products',
    'sort_order',
    true,
    'Não foi possível carregar os produtos.',
  );
  return { products: items, loading, error, reload };
}

export function useAdminAppointmentProducts() {
  const { items, loading, error, reload } = useLoader<AppointmentProduct>(
    'appointment_products',
    'created_at',
    true,
    'Não foi possível carregar os adicionais dos agendamentos.',
  );
  return { products: items, loading, error, reload };
}

export function useAdminCash() {
  const { items, loading, error, reload } = useLoader<CashEntry>(
    'cash_entries',
    'entry_date',
    false,
    'Não foi possível carregar o caixa.',
  );
  return { entries: items, loading, error, reload };
}

export function useAdminBlocks() {
  const { items, loading, error, reload } = useLoader<BlockedSlot>(
    'blocked_slots',
    'block_date',
    false,
    'Não foi possível carregar os bloqueios.',
  );
  return { blocks: items, loading, error, reload };
}

export function useAdminEvents() {
  const { items, loading, error, reload } = useLoader<AppointmentEvent>(
    'appointment_events',
    'created_at',
    false,
    'Não foi possível carregar o histórico.',
  );
  return { events: items, loading, error, reload };
}

/** Loads events for a single appointment, most recent first. */
export function useAppointmentEvents(appointmentId: string | null) {
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('appointment_events')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setEvents((data as AppointmentEvent[]) || []);
    } catch {
      setError('Não foi possível carregar o histórico deste atendimento.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, reload: load };
}