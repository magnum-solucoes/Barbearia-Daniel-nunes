import { useCallback, useMemo, useState } from 'react';
import { adminDeleteAppointment, adminRemoveAppointmentProduct, adminSetStatus } from '@/lib/admin';
import { makeIdempotencyKey, instantDate, instantLongDate, instantTime, todayInTz } from '@/lib/booking';
import {
  useAdminAppointments,
  useAdminAppointmentProducts,
  useAdminCash,
  useAdminProducts,
  useAdminServices,
} from '@/hooks/useAdminData';
import type { Appointment, AppointmentProduct } from '@/types/barber';
import { Button, EmptyBlock, ErrorBlock, LoadingBlock, Notice, SectionHeading, TextInput } from '../ui';
import AppointmentCard from './AppointmentCard';
import ManualBookingModal from './ManualBookingModal';
import RescheduleModal from './RescheduleModal';
import PaymentModal from './PaymentModal';
import AppointmentHistoryModal from './AppointmentHistoryModal';

type FilterKey = 'today' | 'upcoming' | 'history' | 'no_show' | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'upcoming', label: 'Próximos' },
  { key: 'history', label: 'Histórico' },
  { key: 'no_show', label: 'Não veio' },
  { key: 'all', label: 'Todos' },
];

interface AppointmentsTabProps {
  timeZone: string;
}

export default function AppointmentsTab({ timeZone }: AppointmentsTabProps) {
  const { appointments, loading, error, reload } = useAdminAppointments();
  const { entries, reload: reloadCash } = useAdminCash();
  const { services } = useAdminServices();
  const { products: catalogProducts } = useAdminProducts();
  const { products: appointmentProducts, reload: reloadAppointmentProducts } = useAdminAppointmentProducts();

  // Active (reserved) upsell products grouped by appointment.
  const reservedByAppointment = useMemo(() => {
    const map = new Map<string, AppointmentProduct[]>();
    for (const p of appointmentProducts) {
      if (p.status !== 'reserved') continue;
      const list = map.get(p.appointment_id) || [];
      list.push(p);
      map.set(p.appointment_id, list);
    }
    return map;
  }, [appointmentProducts]);

  const productsDueByAppointment = useMemo(() => {
    const map = new Map<string, number>();
    reservedByAppointment.forEach((list, id) => {
      map.set(id, list.reduce((s, p) => s + Number(p.product_price_snapshot) * p.quantity, 0));
    });
    return map;
  }, [reservedByAppointment]);

  const dueTotalOf = useCallback(
    (a: Appointment) => (Number(a.service_price_snapshot) || 0) + (productsDueByAppointment.get(a.id) || 0),
    [productsDueByAppointment],
  );

  // Real income payments per appointment, summed from cash_entries only.
  const paidByAppointment = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (e.type !== 'income' || !e.appointment_id) continue;
      map.set(e.appointment_id, (map.get(e.appointment_id) || 0) + Number(e.amount));
    }
    return map;
  }, [entries]);

  const [filter, setFilter] = useState<FilterKey>('today');
  const [dayDate, setDayDate] = useState(todayInTz(timeZone));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Appointment | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const today = todayInTz(timeZone);
  const now = Date.now();

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const aDate = instantDate(a.start_at, timeZone);
      const startMs = new Date(a.start_at).getTime();
      switch (filter) {
        case 'today':
          return aDate === today && a.status !== 'cancelled';
        case 'upcoming':
          return startMs >= now && (a.status === 'pending' || a.status === 'confirmed');
        case 'history':
          return a.status === 'completed' || a.status === 'cancelled';
        case 'no_show':
          return a.status === 'no_show';
        default:
          return true;
      }
    });
  }, [appointments, filter, timeZone, today, now]);

  const grouped = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const d = instantDate(a.start_at, timeZone);
      const list = map.get(d) || [];
      list.push(a);
      map.set(d, list);
    }
    return Array.from(map.entries()).sort((x, y) => (x[0] < y[0] ? -1 : 1));
  }, [filtered, timeZone]);

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => instantDate(a.start_at, timeZone) === dayDate && a.status !== 'cancelled')
        .sort((a, b) => (a.start_at < b.start_at ? -1 : 1)),
    [appointments, dayDate, timeZone],
  );

  const counts = useMemo(() => {
    return {
      today: appointments.filter((a) => instantDate(a.start_at, timeZone) === today && a.status !== 'cancelled').length,
      pending: appointments.filter((a) => a.status === 'pending').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      no_show: appointments.filter((a) => a.status === 'no_show').length,
    };
  }, [appointments, timeZone, today]);

  const runAction = useCallback(
    async (a: Appointment, fn: () => Promise<{ ok: boolean; message?: string }>, successMsg: string) => {
      setBusyId(a.id);
      setNotice(null);
      const res = await fn();
      setBusyId(null);
      if (!res.ok) {
        setNotice({ kind: 'error', message: res.message || 'Ação não concluída.' });
        return;
      }
      setNotice({ kind: 'success', message: successMsg });
      reload();
    },
    [reload],
  );

  const handleRemoveProduct = useCallback(
    async (a: Appointment, productRowId: string) => {
      setBusyId(a.id);
      setNotice(null);
      const res = await adminRemoveAppointmentProduct(productRowId, makeIdempotencyKey());
      setBusyId(null);
      if (!res.ok) {
        setNotice({ kind: 'error', message: res.message });
        return;
      }
      setNotice({ kind: 'success', message: 'Adicional removido do agendamento.' });
      reloadAppointmentProducts();
    },
    [reloadAppointmentProducts],
  );

  return (
    <div>
      <SectionHeading
        title="Agendamentos"
        subtitle="Agenda do dia, horários livres e gestão dos atendimentos."
        action={
          <Button variant="primary" icon="ri-add-line" onClick={() => setManualOpen(true)}>
            Nova reserva
          </Button>
        }
      />

      {notice && <Notice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Hoje', value: counts.today, icon: 'ri-calendar-event-line' },
          { label: 'Pendentes', value: counts.pending, icon: 'ri-time-line' },
          { label: 'Confirmados', value: counts.confirmed, icon: 'ri-checkbox-circle-line' },
          { label: 'Concluídos', value: counts.completed, icon: 'ri-check-double-line' },
          { label: 'Ausências', value: counts.no_show, icon: 'ri-user-unfollow-line' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-background-200 bg-background-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-foreground-500 flex items-center gap-1.5">
              <i className={s.icon} /> {s.label}
            </p>
            <p className="mt-1 font-heading text-2xl text-foreground-950">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Agenda do dia */}
      <div className="rounded-lg border border-background-200 bg-background-50 p-4 md:p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-heading text-lg text-foreground-950">Agenda do dia</h3>
            <p className="text-sm text-foreground-600 capitalize">{instantLongDate(`${dayDate}T12:00:00`, timeZone)}</p>
          </div>
          <div className="w-full sm:w-52">
            <TextInput type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
          </div>
        </div>
        {dayAppointments.length === 0 ? (
          <p className="text-sm text-foreground-500">Nenhum atendimento nesta data. Use “Nova reserva” para adicionar.</p>
        ) : (
          <div className="space-y-2">
            {dayAppointments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-background-200 px-4 py-2.5">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground-950">
                    {instantTime(a.start_at, timeZone)}
                  </span>
                  <span className="text-sm text-foreground-700 truncate">{a.client_name} · {a.service_name_snapshot}</span>
                </div>
                <Button variant="ghost" icon="ri-calendar-2-line" onClick={() => setRescheduleTarget(a)}>
                  Remarcar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
              filter === f.key
                ? 'bg-foreground-950 border-foreground-950 text-background-50 font-semibold'
                : 'border-background-300 text-foreground-700 hover:border-primary-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock label="Carregando agendamentos..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyBlock message="Nenhum agendamento encontrado neste filtro." icon="ri-calendar-line" />
      ) : (
        <div className="space-y-8">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <h3 className="font-heading text-base text-foreground-800 mb-3 capitalize flex items-center gap-2">
                <i className="ri-calendar-line text-primary-600" /> {instantLongDate(items[0].start_at, timeZone)}
                <span className="text-xs font-normal text-foreground-500">({items.length})</span>
              </h3>
              <div className="space-y-3">
                {items.map((a) => (
                  <AppointmentCard
                    key={a.id}
                    appointment={a}
                    timeZone={timeZone}
                    busy={busyId === a.id}
                    paid={paidByAppointment.get(a.id) || 0}
                    products={reservedByAppointment.get(a.id) || []}
                    dueTotal={dueTotalOf(a)}
                    onRemoveProduct={(rowId) => handleRemoveProduct(a, rowId)}
                    onConfirm={() => runAction(a, () => adminSetStatus(a.id, 'confirmed', makeIdempotencyKey()), 'Agendamento confirmado.')}
                    onComplete={() => runAction(a, () => adminSetStatus(a.id, 'completed', makeIdempotencyKey()), 'Atendimento concluído.')}
                    onNoShow={() => runAction(a, () => adminSetStatus(a.id, 'no_show', makeIdempotencyKey()), 'Ausência registrada.')}
                    onCancel={() => runAction(a, () => adminSetStatus(a.id, 'cancelled', makeIdempotencyKey()), 'Agendamento cancelado.')}
                    onDelete={() => runAction(a, () => adminDeleteAppointment(a.id), 'Agendamento excluído.')}
                    onReschedule={() => setRescheduleTarget(a)}
                    onPay={() => setPaymentTarget(a)}
                    onViewHistory={() => setHistoryId(a.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ManualBookingModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        services={services}
        products={catalogProducts}
        timeZone={timeZone}
        onSuccess={(message) => {
          setNotice({ kind: 'success', message });
          reload();
          reloadAppointmentProducts();
        }}
      />
      <RescheduleModal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        appointment={rescheduleTarget}
        timeZone={timeZone}
        onSuccess={(message) => {
          setNotice({ kind: 'success', message });
          reload();
        }}
      />
      <PaymentModal
        open={Boolean(paymentTarget)}
        onClose={() => setPaymentTarget(null)}
        appointment={paymentTarget}
        timeZone={timeZone}
        onSuccess={(message) => {
          setNotice({ kind: 'success', message });
          reloadCash();
          reload();
        }}
      />
      <AppointmentHistoryModal
        open={Boolean(historyId)}
        onClose={() => setHistoryId(null)}
        appointmentId={historyId}
        timeZone={timeZone}
      />
    </div>
  );
}