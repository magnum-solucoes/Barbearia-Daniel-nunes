import { Link } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { whatsappLink } from '@/lib/format';

export default function HomeHero() {
  const { settings } = useSettings();
  const whatsapp = settings?.whatsapp || '5567996647510';

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-foreground-900 to-foreground-950">
      {/* Foto do Daniel como fundo da primeira dobra (mobile / tablet) */}
      <div className="absolute inset-0 lg:hidden" aria-hidden="true">
        <img
          src="https://static.readdy.ai/image/0a4a0c532c36936122ea3cf733615162/6f5f681ba37b5ab508346bda64816aa4.jpeg"
          alt=""
          className="w-full h-full object-cover object-[50%_24%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground-950/90 via-foreground-950/60 to-foreground-950/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground-950/55 via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto w-full grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-14 px-4 md:px-8 pt-28 md:pt-32 pb-14 md:pb-20 min-h-[92svh] lg:min-h-0">
        {/* Conteúdo de texto — legível sobre a foto no mobile, em coluna no desktop */}
        <div className="order-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-400/50 bg-foreground-950/40 backdrop-blur-sm px-4 py-1.5 text-xs md:text-sm tracking-[0.2em] uppercase text-primary-200">
            <i className="ri-map-pin-line" /> Dourados / MS
          </span>
          <h1 className="mt-5 font-heading text-3xl md:text-6xl text-background-50 leading-tight [text-shadow:_0_2px_24px_rgba(0,0,0,0.55)]">
            Seu corte, seu estilo,<br className="hidden md:block" /> no seu horário.
          </h1>
          <p className="mt-4 md:mt-5 max-w-xl text-sm md:text-lg text-background-100 leading-relaxed [text-shadow:_0_1px_12px_rgba(0,0,0,0.6)]">
            Barbearia Daniel Nunes — mais de 9 anos de experiência em cortes masculinos e barba, com atendimento
            individual e cuidado em cada detalhe.
          </p>

          <div className="mt-7 md:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Link
              to="/agenda"
              className="w-full sm:w-auto whitespace-nowrap rounded-md bg-primary-500 hover:bg-primary-600 text-foreground-950 text-sm md:text-base font-semibold px-7 py-3.5 inline-flex items-center justify-center gap-2 transition-colors"
            >
              <i className="ri-calendar-check-line" /> Agendar horário
            </Link>
            <a
              href={whatsappLink(whatsapp, 'Olá, Daniel! Gostaria de agendar um horário.')}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto whitespace-nowrap rounded-md bg-[#25D366] hover:bg-[#1DA851] text-white text-sm md:text-base font-semibold px-7 py-3.5 inline-flex items-center justify-center gap-2 transition-colors"
            >
              <i className="ri-whatsapp-line" /> Falar no WhatsApp
            </a>
          </div>

          <div className="mt-10 md:mt-12 grid grid-cols-3 gap-6 md:gap-10 max-w-lg text-background-100">
            <div>
              <p className="font-heading text-2xl md:text-3xl text-primary-300">9+</p>
              <p className="text-[11px] md:text-sm text-background-200">anos de experiência</p>
            </div>
            <div>
              <p className="font-heading text-2xl md:text-3xl text-primary-300">1</p>
              <p className="text-[11px] md:text-sm text-background-200">profissional dedicado</p>
            </div>
            <div>
              <p className="font-heading text-2xl md:text-3xl text-primary-300">08h–19h</p>
              <p className="text-[11px] md:text-sm text-background-200">segunda a sábado</p>
            </div>
          </div>
        </div>

        {/* Fotografia oficial do Daniel Nunes — visível apenas no layout de duas colunas (desktop) */}
        <div className="order-2 relative hidden lg:block">
          <div className="relative mx-auto w-full max-w-md lg:max-w-none aspect-[4/5] rounded-lg overflow-hidden ring-1 ring-primary-500/30">
            <img
              src="https://static.readdy.ai/image/0a4a0c532c36936122ea3cf733615162/6f5f681ba37b5ab508346bda64816aa4.jpeg"
              alt="Daniel Nunes, barbeiro, segurando a tesoura na Barbearia Daniel Nunes"
              title="Barbearia Daniel Nunes — Barbearia em Dourados/MS"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </div>
    </section>
  );
}