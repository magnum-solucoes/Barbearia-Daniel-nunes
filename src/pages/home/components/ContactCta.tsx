import { Link } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { whatsappLink } from '@/lib/format';

export default function ContactCta() {
  const { settings } = useSettings();
  const whatsapp = settings?.whatsapp || '5567996647510';
  const instagram = (settings?.instagram || '@barbeariadanielnunes').replace('@', '');
  const email = settings?.email || 'barbeariadanielnunes@gmail.com';

  const cards = [
    {
      icon: 'ri-whatsapp-line',
      title: 'WhatsApp',
      value: 'Falar no WhatsApp',
      href: whatsappLink(whatsapp, 'Olá, Daniel! Gostaria de tirar uma dúvida sobre os atendimentos.'),
      external: true,
    },
    {
      icon: 'ri-instagram-line',
      title: 'Instagram',
      value: `@${instagram}`,
      href: `https://instagram.com/${instagram}`,
      external: true,
    },
    {
      icon: 'ri-mail-line',
      title: 'E-mail',
      value: email,
      href: `mailto:${email}`,
      external: false,
    },
  ];

  return (
    <section id="contato" className="w-full bg-foreground-950 py-16 md:py-24">
      <div className="w-full px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs md:text-sm tracking-[0.25em] uppercase text-primary-300">Contato</span>
          <h2 className="mt-3 font-heading text-3xl md:text-4xl text-background-50">Fale com a gente</h2>
          <p className="mt-4 text-sm md:text-base text-background-200 leading-relaxed">
            Dúvidas, avisos ou pedido de horário — é só chamar. Para agendar, use a agenda online.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              target={card.external ? '_blank' : undefined}
              rel={card.external ? 'noopener noreferrer' : undefined}
              className={`rounded-lg border p-6 text-center transition-colors ${card.title === 'WhatsApp' ? 'border-[#25D366]/40 bg-[#25D366]/10 hover:border-[#25D366]' : 'border-primary-500/20 bg-background-50/5 hover:border-primary-400'}`}
            >
              <span className={`mx-auto w-12 h-12 flex items-center justify-center rounded-md text-2xl ${card.title === 'WhatsApp' ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-primary-500/15 text-primary-300'}`}>
                <i className={card.icon} />
              </span>
              <h3 className="mt-4 font-heading text-lg text-background-50">{card.title}</h3>
              <p className="mt-1 text-sm text-background-200 break-all">{card.value}</p>
            </a>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-primary-500/25 bg-gradient-to-r from-primary-950/40 to-accent-900/30 p-8 md:p-12 text-center">
          <h3 className="font-heading text-2xl md:text-3xl text-background-50">Pronto para cuidar do seu estilo?</h3>
          <p className="mt-3 text-sm md:text-base text-background-200">
            Escolha seu serviço, a data e o horário ideal para você.
          </p>
          <Link
            to="/agenda"
            className="mt-6 whitespace-nowrap rounded-md bg-primary-500 hover:bg-primary-600 text-foreground-950 text-sm md:text-base font-semibold px-8 py-3.5 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <i className="ri-calendar-check-line" /> Agendar horário
          </Link>
        </div>
      </div>
    </section>
  );
}