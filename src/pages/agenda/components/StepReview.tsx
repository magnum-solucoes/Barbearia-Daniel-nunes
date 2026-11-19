import { formatLongDate } from '@/lib/booking';
import { formatBRL, formatPhoneBR } from '@/lib/format';
import type { Service } from '@/types/barber';
import type { DetailsValues } from './StepDetails';

export interface ReviewProduct {
  name: string;
  price: number;
  quantity: number;
  /** Extra minutes added by this add-on (0 for physical products). */
  durationMinutes?: number;
}

interface StepReviewProps {
  service: Service;
  /** Price resolved for the selected date (weekday promo aware). */
  servicePrice?: number;
  date: string;
  time: string;
  timeZone: string;
  values: DetailsValues;
  /** Labels for each participant (two-person packages). */
  participantLabels?: string[];
  products?: ReviewProduct[];
  address?: string;
}

export default function StepReview({
  service,
  servicePrice,
  date,
  time,
  timeZone,
  values,
  participantLabels = [],
  products = [],
  address,
}: StepReviewProps) {
  const basePrice = typeof servicePrice === 'number' ? servicePrice : Number(service.price);
  const productsTotal = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const addonDuration = products.reduce((sum, p) => sum + (p.durationMinutes || 0) * p.quantity, 0);
  const totalDuration = (Number(service.duration_minutes) || 0) + addonDuration;
  const total = basePrice + productsTotal;
  const participants = values.participants.filter((p) => p.trim().length > 0);
  const many = participants.length > 1;

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: 'ri-scissors-2-line', label: many ? 'Pacote' : 'Serviço', value: service.name },
    { icon: 'ri-time-line', label: 'Duração', value: `${totalDuration} min` },
    { icon: 'ri-money-dollar-circle-line', label: 'Valor do serviço', value: formatBRL(basePrice) },
    { icon: 'ri-calendar-line', label: 'Data', value: formatLongDate(date, timeZone) },
    { icon: 'ri-alarm-line', label: 'Horário', value: time },
    ...participants.map((name, index) => ({
      icon: index === 0 ? 'ri-user-line' : 'ri-user-2-line',
      label: many ? participantLabels[index] || `Participante ${index + 1}` : 'Cliente',
      value: name,
    })),
    { icon: 'ri-whatsapp-line', label: 'WhatsApp de contato', value: formatPhoneBR(values.phone) },
  ];

  return (
    <div>
      <h2 className="font-heading text-2xl md:text-3xl text-foreground-950">Revise seu agendamento</h2>
      <p className="mt-2 text-sm text-foreground-600">Confira os dados antes de confirmar.</p>

      <div className="mt-7 rounded-lg border border-background-200 bg-background-50 overflow-hidden max-w-2xl">
        <div className="bg-foreground-950 px-5 py-4">
          <p className="font-heading text-lg text-primary-300">{service.name}</p>
          <p className="mt-1 text-sm text-background-200 capitalize">
            {formatLongDate(date, timeZone)} · {time}
          </p>
        </div>
        <div className="divide-y divide-background-200">
          {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="flex items-center gap-2.5 text-sm text-foreground-600">
                <span className="w-5 h-5 flex items-center justify-center text-primary-600">
                  <i className={row.icon} />
                </span>
                {row.label}
              </span>
              <span className="text-sm font-medium text-foreground-950 text-right">{row.value}</span>
            </div>
          ))}
        </div>
        {values.notes && (
          <div className="border-t border-background-200 px-5 py-3.5">
            <p className="text-xs text-foreground-500 mb-1">Observações</p>
            <p className="text-sm text-foreground-800">{values.notes}</p>
          </div>
        )}
      </div>

      {products.length > 0 && (
        <div className="mt-5 rounded-lg border border-primary-300 bg-primary-50 overflow-hidden max-w-2xl">
          <div className="px-5 py-3 flex items-center gap-2">
            <span className="w-5 h-5 flex items-center justify-center text-primary-700">
              <i className="ri-add-circle-line" />
            </span>
            <p className="text-sm font-semibold text-primary-800">Adicionais selecionados</p>
          </div>
          <div className="divide-y divide-primary-200/60 bg-background-50">
            {products.map((p) => (
              <div key={p.name} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm text-foreground-800">
                  {p.name}
                  {p.quantity > 1 ? ` ×${p.quantity}` : ''}
                </span>
                <span className="text-sm font-medium text-foreground-950">{formatBRL(p.price * p.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-lg border border-background-200 bg-background-50 px-5 py-4 flex items-center justify-between gap-4 max-w-2xl">
        <span className="text-sm uppercase tracking-[0.15em] text-foreground-600">Total</span>
        <span className="font-heading text-2xl text-foreground-950">{formatBRL(total)}</span>
      </div>
      <p className="mt-2 text-xs text-foreground-500 max-w-2xl">
        O valor do serviço é o praticado pela barbearia. {products.length > 0
          ? 'Os adicionais são pagos presencialmente na barbearia; apenas os serviços adicionais acrescentam tempo ao atendimento.'
          : 'Não há pagamento online.'}{' '}
        Ao confirmar, seu horário entra como solicitação com status pendente, aguardando a confirmação da barbearia.
      </p>

      {address && (
        <p className="mt-4 text-xs text-foreground-500 flex items-start gap-2 max-w-2xl">
          <span className="w-4 h-4 flex items-center justify-center text-primary-600 mt-0.5">
            <i className="ri-map-pin-line" />
          </span>
          {address}
        </p>
      )}
    </div>
  );
}