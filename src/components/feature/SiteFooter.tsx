import { Link } from 'react-router-dom';
import { LOGO_URL, NAV_LINKS } from '@/lib/site';
import { useSettings } from '@/hooks/useSettings';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { formatPhoneBR, hhmm, whatsappLink, WEEKDAYS_SHORT } from '@/lib/format';

export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettings();
  const { hours } = useBusinessHours();

  const whatsapp = settings?.whatsapp || '5567996647510';
  const instagram = (settings?.instagram || '@barbeariadanielnunes').replace('@', '');

  // Compact footer: keeps the booking flow focused on completing the reservation.
  if (compact) {
    return (
      <footer className="bg-accent-900 text-background-200">
        <div className="w-full px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} Barbearia Daniel Nunes · Dourados/MS</p>
          <div className="flex items-center gap-4">
            <a
              href={whatsappLink(whatsapp, 'Olá! Gostaria de informações sobre os atendimentos da Barbearia Daniel Nunes.')}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-300 transition-colors inline-flex items-center gap-1.5"
            >
              <i className="ri-whatsapp-line" /> Falar com a barbearia
            </a>
            <Link to="/" className="hover:text-primary-300 transition-colors">
              Voltar ao site
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-accent-900 text-background-100">
      <div className="w-full px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-primary-400/50 flex items-center justify-center">
              <img src={LOGO_URL} alt="Barbearia Daniel Nunes" title="Barbearia Daniel Nunes" className="w-full h-full object-cover" />
            </span>
            <div className="leading-tight">
              <p className="font-heading text-lg text-primary-300">Daniel Nunes</p>
              <p className="text-xs tracking-[0.25em] uppercase text-background-200">Barbearia</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-background-200 leading-relaxed">
            Mais de 9 anos de experiência em cortes masculinos e barba, com atendimento individual em Dourados/MS.
          </p>
        </div>

        <div>
          <h4 className="text-primary-300 font-heading text-base mb-4">Navegação</h4>
          <ul className="space-y-2.5 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link to={`${link.to}${link.hash}`} className="text-background-200 hover:text-primary-300 transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/agenda" className="text-background-200 hover:text-primary-300 transition-colors">
                Agendar horário
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-primary-300 font-heading text-base mb-4">Contato</h4>
          <ul className="space-y-3 text-sm text-background-200">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 flex items-center justify-center text-primary-300 mt-0.5"><i className="ri-map-pin-line" /></span>
              <span>{settings?.address || 'Rua General Osório, nº 695, Jardim Itália, Dourados/MS'}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 flex items-center justify-center text-primary-300 mt-0.5"><i className="ri-whatsapp-line" /></span>
              <a href={whatsappLink(whatsapp, 'Olá! Gostaria de informações sobre os atendimentos da Barbearia Daniel Nunes.')} target="_blank" rel="noopener noreferrer" className="hover:text-primary-300 transition-colors">
                {formatPhoneBR(whatsapp)}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 flex items-center justify-center text-primary-300 mt-0.5"><i className="ri-mail-line" /></span>
              <a href={`mailto:${settings?.email || 'barbeariadanielnunes@gmail.com'}`} className="hover:text-primary-300 transition-colors break-all">
                {settings?.email || 'barbeariadanielnunes@gmail.com'}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 flex items-center justify-center text-primary-300 mt-0.5"><i className="ri-instagram-line" /></span>
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary-300 transition-colors">
                @{instagram}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-primary-300 font-heading text-base mb-4">Horários</h4>
          <ul className="space-y-2 text-sm text-background-200">
            {hours.length === 0 && <li>Segunda a sábado, 08h às 19h</li>}
            {hours.map((h) => (
              <li key={h.id} className="flex justify-between gap-3">
                <span>{WEEKDAYS_SHORT[h.weekday]}</span>
                <span className="text-background-100">
                  {h.is_open && h.open_time && h.close_time ? `${hhmm(h.open_time)} - ${hhmm(h.close_time)}` : 'Fechado'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-400/20">
        <div className="w-full px-4 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-background-200">
          <p>© {new Date().getFullYear()} Barbearia Daniel Nunes. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="hover:text-primary-300 transition-colors">Área administrativa</Link>
            <span className="text-primary-300">Experiência digital desenvolvida pela MAGNUM</span>
          </div>
        </div>
      </div>
    </footer>
  );
}