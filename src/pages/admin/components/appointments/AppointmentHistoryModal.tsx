import { useAppointmentEvents } from '@/hooks/useAdminData';
import { instantFull } from '@/lib/booking';
import { STATUS_META, EmptyBlock, LoadingBlock, Modal } from '../ui';

const EVENT_LABELS: Record<string, { label: string; icon: string }> = {
  created: { label: 'Criado', icon: 'ri-add-circle-line' },
  rescheduled: { label: 'Remarcado', icon: 'ri-calendar-2-line' },
  status_changed: { label: 'Status alterado', icon: 'ri-refresh-line' },
  no_show: { label: 'Ausência registrada', icon: 'ri-user-unfollow-line' },
  deleted: { label: 'Excluído', icon: 'ri-delete-bin-line' },
};

function statusOf(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const s = data.status;
  return typeof s === 'string' ? s : null;
}

interface AppointmentHistoryModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string | null;
  timeZone: string;
}

export default function AppointmentHistoryModal({ open, onClose, appointmentId, timeZone }: AppointmentHistoryModalProps) {
  const { events, loading, error } = useAppointmentEvents(open ? appointmentId : null);

  return (
    <Modal open={open} onClose={onClose} title="Histórico do atendimento">
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <p className="text-sm text-accent-700">{error}</p>
      ) : events.length === 0 ? (
        <EmptyBlock message="Nenhum registro para este atendimento." icon="ri-history-line" />
      ) : (
        <ol className="relative border-l border-background-300 ml-2 space-y-5">
          {events.map((ev) => {
            const meta = EVENT_LABELS[ev.event_type] || { label: ev.event_type, icon: 'ri-information-line' };
            const before = statusOf(ev.before_data);
            const after = statusOf(ev.after_data);
            return (
              <li key={ev.id} className="ml-5">
                <span className="absolute -left-[9px] w-4 h-4 rounded-full bg-background-50 border-2 border-primary-500 flex items-center justify-center" />
                <p className="text-sm font-medium text-foreground-900 flex items-center gap-2">
                  <i className={meta.icon} /> {meta.label}
                </p>
                <p className="text-xs text-foreground-500 mt-0.5">{instantFull(ev.created_at, timeZone)}</p>
                {before && after && before !== after && (
                  <p className="text-xs text-foreground-600 mt-1">
                    {STATUS_META[before]?.label || before} → <strong>{STATUS_META[after]?.label || after}</strong>
                  </p>
                )}
                {ev.event_type === 'rescheduled' && ev.after_data && (
                  <p className="text-xs text-foreground-600 mt-1">
                    {(() => {
                      try {
                        const a = ev.after_data as Record<string, unknown>;
                        return `Novo início: ${instantFull(String(a.start_at), timeZone)}`;
                      } catch {
                        return '';
                      }
                    })()}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}