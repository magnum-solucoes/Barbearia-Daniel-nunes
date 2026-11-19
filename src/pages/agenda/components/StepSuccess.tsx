import { Link } from 'react-router-dom';
import { formatLongDate } from '@/lib/booking';
import { formatBRL, whatsappHref } from '@/lib/format';
import type { BookingConfirmation, BookingBusiness } from '@/lib/booking';

interface StepSuccessProps {
  appointment: BookingConfirmation;
  business: BookingBusiness;
  timeZone: string;
}

/** Official barbershop WhatsApp (fallback when the settings value is unavailable). */
const SHOP_WHATSAPP = '5567996647510';

export default function StepSuccess({ appointment, business, timeZone }: StepSuccessProps) {
  const dateLabel = formatLongDate(appointment.date, timeZone);
  const products = appointment.products || [];
  const productsTotal = products.reduce((sum, p) => sum + Number(p.price) * Number(p.quantity), 0);
  const total = Number(appointment.price) + productsTotal;
  const participants = (appointment.participants || []).filter((p) => String(p).trim().length > 0);
  const many = participants.length > 1;

  const productSection = products.length
    ? `Adicionais:
${products
        .map((p) => `• ${p.name}${p.quantity > 1 ? ` ×${p.quantity}` : ''} — ${formatBRL(p.price * p.quantity)}`)
        .join('\n')}\n\n`
    : '';

  const identityLine = many
    ? `Pacote: ${appointment.service_name}\nParticipantes: ${participants.join(' e ')}\n`
    : `Cliente: ${appointment.client_name}\nServiço: ${appointment.service_name}\n`;

  const message =
    `Olá! Acabei de solicitar um agendamento na Barbearia Daniel Nunes.\n\n` +
    identityLine +
    `Data: ${dateLabel}\n` +
    `Horário: ${appointment.time}\n\n` +
    productSection +
    `Total: ${formatBRL(total)}\n\n` +
    `Aguardo a confirmação do meu horário. Obrigado!`;

  const notifyHref =
    whatsappHref(business.whatsapp, message) || whatsappHref(SHOP_WHATSAPP, message) || '#';

  return (
    <div className="max-w-2xl mx-auto text-center">
      <span className="w-16 h-16 mx-auto rounded-full bg-primary-500 flex items-center justify-center">
        <i className="ri-check-line text-3xl text-foreground-950" />
      </span>
      <h2 className="mt-5 font-heading text-2xl md:text-3xl text-foreground-950">
        Solicitação de agendamento recebida!
      </h2>
      <p className="mt-2 text-sm text-foreground-600">
        Seu pedido foi registrado e aguarda a confirmação da barbearia. Avise pelo WhatsApp para agilizar.
      </p>

      <div className="mt-7 rounded-lg border border-background-200 bg-background-50 text-left overflow-hidden">
        <div className="bg-foreground-950 px-5 py-4">
          <p className="font-heading text-lg text-primary-300">{appointment.service_name}</p>
          <p className="mt-1 text-sm text-background-200 capitalize">
            {dateLabel} · {appointment.time}
          </p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-500/15 border border-primary-500/40 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-primary-300">
            <i className="ri-time-line" /> Aguardando confirmação
          </span>
        </div>
        <div className="divide-y divide-background-200">
          {many ? (
            <div className="px-5 py-3.5">
              <span className="text-sm text-foreground-600">Participantes</span>
              <ul className="mt-1.5 space-y-1">
                {participants.map((name) => (
                  <li key={name} className="text-sm font-medium text-foreground-950 flex items-center gap-2">
                    <i className="ri-user-line text-primary-600" /> {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-sm text-foreground-600">Cliente</span>
              <span className="text-sm font-medium text-foreground-950">{appointment.client_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <span className="text-sm text-foreground-600">Duração</span>
            <span className="text-sm font-medium text-foreground-950">{appointment.duration_minutes} min</span>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <span className="text-sm text-foreground-600">Valor do serviço</span>
            <span className="text-sm font-semibold text-foreground-950">{formatBRL(appointment.price)}</span>
          </div>
          {products.map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-4 px-5 py-3">
              <span className="text-sm text-foreground-600 flex items-center gap-1.5">
                <i className="ri-shopping-bag-3-line text-primary-600" />
                {p.name}
                {p.quantity > 1 ? ` ×${p.quantity}` : ''}
              </span>
              <span className="text-sm font-medium text-foreground-950">{formatBRL(p.price * p.quantity)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-primary-50">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-800">Total</span>
            <span className="font-heading text-lg text-foreground-950">{formatBRL(total)}</span>
          </div>
          <div className="flex items-start justify-between gap-4 px-5 py-3.5">
            <span className="text-sm text-foreground-600 shrink-0">Endereço</span>
            <span className="text-sm font-medium text-foreground-950 text-right">
              {business.address || 'Rua General Osório, nº 695, Jardim Itália, Dourados/MS'}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-foreground-500 flex items-center justify-center gap-2 text-center">
        <i className="ri-information-line" /> O valor do serviço é o praticado pela barbearia.
        {products.length > 0 && ' Os adicionais selecionados são pagos presencialmente na barbearia.'}
      </p>
      <p className="mt-2 text-xs text-foreground-500 flex items-center justify-center gap-2 text-center">
        <i className="ri-whatsapp-line" /> O envio é manual — o WhatsApp abre com a mensagem pronta; toque em enviar.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={notifyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap rounded-md bg-primary-500 hover:bg-primary-600 text-foreground-950 text-sm font-semibold px-6 py-3 inline-flex items-center justify-center gap-2"
        >
          <i className="ri-whatsapp-line text-lg" /> Avisar a barbearia pelo WhatsApp
        </a>
        <Link
          to="/"
          className="whitespace-nowrap rounded-md border border-background-300 bg-background-50 hover:border-primary-400 text-foreground-950 text-sm font-semibold px-6 py-3 inline-flex items-center justify-center gap-2"
        >
          <i className="ri-home-line" /> Voltar para a home
        </Link>
      </div>
      <p className="mt-3 text-xs text-foreground-500">
        Sua solicitação já está registrada no painel da barbearia, mesmo que você não envie a mensagem.
      </p>
    </div>
  );
}