import { useSettings } from '@/hooks/useSettings';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { hhmm, whatsappLink, WEEKDAYS_LABELS } from '@/lib/format';

export default function HoursLocation() {
  const { settings } = useSettings();
  const { hours } = useBusinessHours();
  const whatsapp = settings?.whatsapp || '5567996647510';
  const mapsUrl =
    settings?.maps_url ||
    'https://www.google.com/maps/search/?api=1&query=Rua+General+Osorio+695+Jardim+Italia+Dourados+MS';

  const embedUrl =
    'https://www.google.com/maps?q=Rua+General+Os%C3%B3rio+695+Jardim+It%C3%A1lia+Dourados+MS&output=embed';

  return (
    <section id="horarios" className="w-full bg-background-100 py-16 md:py-24">
      <div className="w-full px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs md:text-sm tracking-[0.25em] uppercase text-accent-600">Horários & Local</span>
          <h2 className="mt-3 font-heading text-3xl md:text-4xl text-foreground-950">Quando e onde nos encontrar</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-lg border border-background-200 bg-background-50 p-6 md:p-8">
            <h3 className="font-heading text-xl text-foreground-950 flex items-center gap-2">
              <span className="w-9 h-9 flex items-center justify-center rounded-md bg-primary-100 text-primary-700 text-lg"><i className="ri-time-line" /></span>
              Horário de funcionamento
            </h3>
            <ul className="mt-6 divide-y divide-background-100">
              {hours.length === 0 && (
                <li className="py-3 text-sm text-foreground-600">Segunda a sábado, 08h às 19h</li>
              )}
              {hours.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-foreground-800">{WEEKDAYS_LABELS[h.weekday]}</span>
                  <span className={h.is_open ? 'text-accent-700 font-medium' : 'text-secondary-500'}>
                    {h.is_open && h.open_time && h.close_time ? `${hhmm(h.open_time)} às ${hhmm(h.close_time)}` : 'Fechado'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-start gap-3 rounded-lg bg-secondary-50 border border-secondary-100 p-4">
              <span className="w-9 h-9 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-800 text-lg shrink-0"><i className="ri-map-pin-line" /></span>
              <p className="text-sm text-foreground-700 leading-relaxed">
                {settings?.address || 'Rua General Osório, nº 695, Jardim Itália, Dourados/MS'}
              </p>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 whitespace-nowrap rounded-md border border-primary-400 text-primary-700 hover:bg-primary-50 px-5 py-3 text-sm font-medium text-center inline-flex items-center justify-center gap-2 transition-colors"
              >
                <i className="ri-road-map-line" /> Ver no Maps
              </a>
              <a
                href={whatsappLink(whatsapp, 'Olá, Daniel! Gostaria de agendar um horário.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 whitespace-nowrap rounded-md bg-[#25D366] hover:bg-[#1DA851] text-white px-5 py-3 text-sm font-semibold text-center inline-flex items-center justify-center gap-2 transition-colors"
              >
                <i className="ri-whatsapp-line" /> Chamar no WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-background-200 bg-background-50 flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-background-200">
              <p className="flex items-center gap-2.5 text-sm text-foreground-800 min-w-0">
                <span className="w-8 h-8 flex items-center justify-center rounded-md bg-primary-100 text-primary-700 shrink-0">
                  <i className="ri-map-pin-2-line" />
                </span>
                <span className="truncate">
                  {settings?.address || 'Rua General Osório, no 695, Jardim Itália, Dourados/MS'}
                </span>
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap text-xs font-semibold text-primary-700 hover:text-primary-800 inline-flex items-center gap-1.5"
              >
                <i className="ri-external-link-line" /> Abrir no Maps
              </a>
            </div>
            <div className="relative w-full h-[300px] md:h-[420px] bg-background-100">
              <iframe
                title="Mapa — Barbearia Daniel Nunes em Dourados/MS"
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}