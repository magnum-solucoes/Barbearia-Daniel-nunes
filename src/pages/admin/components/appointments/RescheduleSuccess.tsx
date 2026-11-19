import { formatBRL, formatPhoneBR, whatsappLink } from '@/lib/format';
import { instantLongDate, instantTime } from '@/lib/booking';
import type { Appointment } from '@/types/barber';
import { Button } from '../ui';

interface RescheduleSuccessProps {
  appointment: Appointment;
  previous: { start_at: string; end_at: string };
  timeZone: string;
  onClose: () => void;
}

export default function RescheduleSuccess({ appointment, previous, timeZone, onClose }: RescheduleSuccessProps) {
  const prevLabel = `${instantLongDate(previous.start_at, timeZone)} às ${instantTime(previous.start_at, timeZone)}`;
  const newLabel = `${instantLongDate(appointment.start_at, timeZone)} às ${instantTime(appointment.start_at, timeZone)}`;

  const message =
    `Olá, ${appointment.client_name}! Seu horário na Barbearia Daniel Nunes foi remarcado.\n\n` +
    `Serviço: ${appointment.service_name_snapshot}\n` +
    `Antes: ${prevLabel}\n` +
    `Agora: ${newLabel}\n\n` +
    `Qualquer dúvida, é só responder por aqui.`;

  return (
    <div className="text-center">
      <span className="w-14 h-14 mx-auto rounded-full bg-primary-500 flex items-center justify-center">
        <i className="ri-check-line text-2xl text-foreground-950" />
      </span>
      <h3 className="mt-4 font-heading text-xl text-foreground-950">Agendamento remarcado!</h3>
      <p className="mt-1 text-sm text-foreground-600">Cliente: <strong className="text-foreground-900">{appointment.client_name}</strong></p>

      <div className="mt-5 rounded-lg border border-background-200 overflow-hidden text-left">
        <div className="bg-foreground-950 px-4 py-3">
          <p className="font-heading text-primary-300">{appointment.service_name_snapshot}</p>
          <p className="mt-0.5 text-xs text-background-300">
            {appointment.service_duration_snapshot} min · {formatBRL(appointment.service_price_snapshot)} · {formatPhoneBR(appointment.client_phone)}
          </p>
        </div>
        <div className="divide-y divide-background-200">
          <div className="px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-foreground-500">Horário anterior</p>
            <p className="mt-1 text-sm text-foreground-700 capitalize line-through">{prevLabel}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-foreground-500">Novo horário</p>
            <p className="mt-1 text-sm font-semibold text-foreground-950 capitalize">{newLabel}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-foreground-500 flex items-center justify-center gap-2">
        <i className="ri-information-line" /> O envio pelo WhatsApp é manual — toque no botão abaixo.
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={whatsappLink(appointment.client_phone, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-md bg-primary-500 hover:bg-primary-600 text-foreground-950 text-sm font-semibold px-5 py-2.5 transition-colors"
        >
          <i className="ri-whatsapp-line text-lg" /> Avisar o cliente
        </a>
        <Button variant="ghost" icon="ri-arrow-left-line" onClick={onClose}>
          Voltar à agenda
        </Button>
      </div>
    </div>
  );
}