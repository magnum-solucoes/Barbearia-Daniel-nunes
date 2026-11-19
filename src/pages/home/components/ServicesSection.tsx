import { Link } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import { formatBRL } from '@/lib/format';
import { promoWeekdaysLabel } from '@/lib/booking';
import type { Service } from '@/types/barber';

function ServiceCard({ service }: { service: Service }) {
  const hasPromo = Boolean(service.promo_enabled && service.promo_price != null);
  const promoLabel = hasPromo ? promoWeekdaysLabel(service.promo_weekdays) : '';
  const promoLabelCap = promoLabel ? promoLabel.charAt(0).toUpperCase() + promoLabel.slice(1) : '';
  const showListPrice = hasPromo && !service.promo_only && Number(service.price) > Number(service.promo_price);
  const twoPeople = Number(service.participants_count) > 1;

  return (
    <article className="group rounded-lg border border-background-200 bg-background-50 overflow-hidden flex flex-col hover:border-primary-400 transition-colors">
      <div className="w-full h-48 overflow-hidden bg-foreground-950">
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.name}
            title={`${service.name} — Barbearia Daniel Nunes`}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary-400">
            <span className="w-16 h-16 flex items-center justify-center text-4xl"><i className="ri-scissors-2-line" /></span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-heading text-xl text-foreground-950">{service.name}</h3>
        {service.description && (
          <p className="mt-2 text-sm text-foreground-600 leading-relaxed flex-1">{service.description}</p>
        )}
        {twoPeople && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground-700">
            <i className="ri-group-line text-primary-600" /> dois cortes no mesmo agendamento
          </p>
        )}
        {hasPromo && promoLabelCap && (
          <p className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full border border-accent-200 bg-accent-100 px-3 py-1 text-xs text-accent-800">
            <i className="ri-price-tag-3-line" /> {promoLabelCap} — preço promocional
          </p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs text-secondary-700 bg-secondary-100 rounded-full px-3 py-1">
            <i className="ri-time-line" /> {service.duration_minutes} min
          </span>
          {hasPromo ? (
            <span className="inline-flex items-baseline gap-2">
              {showListPrice && (
                <span className="text-xs text-foreground-400 line-through">{formatBRL(service.price)}</span>
              )}
              <span className="font-heading text-xl text-accent-700">{formatBRL(service.promo_price)}</span>
            </span>
          ) : (
            <span className="font-heading text-xl text-accent-700">{formatBRL(service.price)}</span>
          )}
        </div>
        <Link
          to={`/agenda?servico=${service.id}`}
          className="mt-5 whitespace-nowrap rounded-md bg-primary-500 hover:bg-primary-600 text-foreground-950 text-sm font-semibold px-5 py-2.5 text-center inline-flex items-center justify-center gap-2 transition-colors"
        >
          <i className="ri-calendar-line" /> Agendar
        </Link>
      </div>
    </article>
  );
}

export default function ServicesSection() {
  const { services, loading, error, reload } = useServices();
  const individuals = services.filter((s) => !s.promo_only);
  const promotions = services.filter((s) => s.promo_only);

  return (
    <section id="servicos" className="w-full bg-background-50 py-16 md:py-24">
      <div className="w-full px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs md:text-sm tracking-[0.25em] uppercase text-accent-600">Serviços</span>
          <h2 className="mt-3 font-heading text-3xl md:text-4xl text-foreground-950">Nossos atendimentos</h2>
          <p className="mt-4 text-sm md:text-base text-foreground-600 leading-relaxed">
            Os mesmos serviços disponíveis na agenda online, com os valores atualizados da barbearia.
          </p>
        </div>

        {loading && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-background-200 overflow-hidden animate-pulse">
                <div className="h-48 bg-background-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 bg-background-100 rounded" />
                  <div className="h-3 w-full bg-background-100 rounded" />
                  <div className="h-3 w-1/3 bg-background-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-12 text-center">
            <p className="text-sm text-foreground-600">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 whitespace-nowrap rounded-md border border-primary-400 text-primary-700 px-5 py-2.5 text-sm font-medium hover:bg-primary-50 transition-colors"
            >
              <i className="ri-refresh-line mr-1" /> Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && services.length === 0 && (
          <p className="mt-12 text-center text-sm text-foreground-600">
            Nenhum serviço ativo no momento. Cadastre os serviços no painel administrativo.
          </p>
        )}

        {!loading && !error && individuals.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-product-shop>
            {individuals.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}

        {!loading && !error && promotions.length > 0 && (
          <div className="mt-16">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs md:text-sm tracking-[0.25em] uppercase text-accent-600">Promoções</span>
              <h3 className="mt-3 font-heading text-2xl md:text-3xl text-foreground-950">Promoções de segunda a quarta</h3>
              <p className="mt-3 text-sm md:text-base text-foreground-600 leading-relaxed">
                Aproveite nossos pacotes especiais e reserve seu horário.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {promotions.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}