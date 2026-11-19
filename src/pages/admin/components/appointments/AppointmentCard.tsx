import type { Appointment, AppointmentProduct } from '@/types/barber';
import { formatBRL, formatPhoneBR, whatsappLink } from '@/lib/format';
import { instantTime } from '@/lib/booking';
import { IconButton, StatusBadge } from '../ui';

interface AppointmentCardProps {
  appointment: Appointment;
  timeZone: string;
  busy: boolean;
  paid: number;
  products: AppointmentProduct[];
  dueTotal: number;
  onConfirm: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onReschedule: () => void;
  onPay: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  onRemoveProduct: (productRowId: string) => void;
}

export default function AppointmentCard({
  appointment: a,
  timeZone,
  busy,
  paid,
  products,
  dueTotal,
  onConfirm,
  onComplete,
  onNoShow,
  onCancel,
  onReschedule,
  onPay,
  onDelete,
  onViewHistory,
  onRemoveProduct,
}: AppointmentCardProps) {
  const start = instantTime(a.start_at, timeZone);
  const end = instantTime(a.end_at, timeZone);

  // Financial status is derived from the reservation snapshots (service + the
  // products still reserved) and the real income payments linked to it.
  const due = Math.max(0, Number(dueTotal) || 0);
  const received = Math.max(0, Number(paid) || 0);
  const remaining = Math.max(0, Math.round((due - received) * 100) / 100);
  const isPaid = (due > 0 && received >= due) || (due === 0 && received > 0);
  const isPartial = !isPaid && received > 0 && received < due;

  const finance = isPaid
    ? { label: 'Pago', detail: `Recebido ${formatBRL(received)}`, badge: 'bg-primary-100 text-primary-800 border-primary-200', icon: 'ri-checkbox-circle-line' }
    : isPartial
      ? { label: 'Parcialmente pago', detail: `Recebido ${formatBRL(received)} · Restante ${formatBRL(remaining)}`, badge: 'bg-accent-100 text-accent-800 border-accent-200', icon: 'ri-pie-chart-line' }
      : { label: `A receber — ${formatBRL(due)}`, detail: '', badge: 'bg-secondary-100 text-secondary-900 border-secondary-200', icon: 'ri-hourglass-line' };

  const showFinance = due > 0 || received > 0;

  const participants = (a.participant_names || []).filter((p) => String(p).trim().length > 0);
  const participantLine = participants.length > 1 ? ` (participantes: ${participants.join(' e ')})` : '';

  const contactMessage =
    `Olá, ${a.client_name}! Aqui é da Barbearia Daniel Nunes. ` +
    `Confirmando seu atendimento de ${a.service_name_snapshot}${participantLine} em ${start}.`;

  const canReschedule = a.status === 'pending' || a.status === 'confirmed';
  const canPay = a.status !== 'cancelled';
  const canDelete = a.status === 'cancelled' || a.status === 'no_show';

  return (
    <div className="rounded-lg border border-background-200 bg-background-50 p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-heading text-lg text-foreground-950">{start} – {end}</span>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-2 text-sm font-medium text-foreground-900">{a.client_name}</p>
          <p className="mt-1 text-sm text-foreground-600 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><i className="ri-scissors-2-line text-primary-600" /> {a.service_name_snapshot}</span>
            <span className="inline-flex items-center gap-1.5"><i className="ri-time-line text-primary-600" /> {a.service_duration_snapshot} min</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground-950"><i className="ri-money-dollar-circle-line text-primary-600" /> {formatBRL(a.service_price_snapshot)}</span>
          </p>
          {participants.length > 1 && (
            <p className="mt-1 text-sm text-foreground-700 flex items-center gap-1.5 flex-wrap">
              <i className="ri-group-line text-primary-600" /> Participantes: {participants.join(' · ')}
            </p>
          )}
          {showFinance && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${finance.badge}`}>
                <i className={finance.icon} /> {finance.label}
              </span>
              {finance.detail && <span className="text-xs text-foreground-600">{finance.detail}</span>}
            </div>
          )}
          {products.length > 0 && (
            <div className="mt-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-2">
              <p className="text-xs font-semibold text-primary-800 flex items-center gap-1.5 mb-1">
                <i className="ri-add-circle-line" /> Adicionais reservados
              </p>
              <ul className="space-y-1">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-foreground-800 truncate">
                      {p.product_name_snapshot}
                      {p.quantity > 1 ? ` ×${p.quantity}` : ''}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-foreground-700">
                        {formatBRL(Number(p.product_price_snapshot) * p.quantity)}
                      </span>
                      <button
                        type="button"
                        title="Remover adicional"
                        aria-label="Remover adicional"
                        disabled={busy}
                        onClick={() => onRemoveProduct(p.id)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-accent-300 text-accent-700 hover:bg-accent-100 disabled:opacity-40"
                      >
                        <i className="ri-close-line text-xs" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-1 text-sm text-foreground-600 flex items-center gap-1.5">
            <i className="ri-whatsapp-line text-primary-600" /> {formatPhoneBR(a.client_phone)}
          </p>
          {a.notes && <p className="mt-2 text-xs text-foreground-500 italic">Obs.: {a.notes}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={whatsappLink(a.client_phone, contactMessage)}
            target="_blank"
            rel="noopener noreferrer"
            title="Falar no WhatsApp"
            aria-label="Falar no WhatsApp"
            className="w-9 h-9 flex items-center justify-center rounded-md border border-primary-300 hover:bg-primary-50 text-primary-800 transition-colors"
          >
            <i className="ri-whatsapp-line" />
          </a>
          <IconButton icon="ri-history-line" title="Ver histórico" onClick={onViewHistory} />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-background-200 flex flex-wrap gap-2">
        {a.status === 'pending' && (
          <IconButton icon="ri-checkbox-circle-line" title="Confirmar" tone="primary" onClick={onConfirm} disabled={busy} />
        )}
        {(a.status === 'pending' || a.status === 'confirmed') && (
          <>
            <IconButton icon="ri-check-double-line" title="Concluir" tone="accent" onClick={onComplete} disabled={busy} />
            <IconButton icon="ri-user-unfollow-line" title="Não veio" tone="accent" onClick={onNoShow} disabled={busy} />
            <IconButton icon="ri-calendar-2-line" title="Remarcar" onClick={onReschedule} disabled={busy} />
            <IconButton icon="ri-close-circle-line" title="Cancelar" onClick={onCancel} disabled={busy} />
          </>
        )}
        {canPay && (
          <IconButton icon="ri-money-dollar-circle-line" title="Registrar pagamento" tone="primary" onClick={onPay} disabled={busy} />
        )}
        {canDelete && (
          <IconButton icon="ri-delete-bin-line" title="Excluir" onClick={onDelete} disabled={busy} />
        )}
      </div>
    </div>
  );
}