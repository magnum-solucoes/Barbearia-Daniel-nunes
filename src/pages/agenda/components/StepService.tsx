import type { Service } from '@/types/barber';
import { formatBRL } from '@/lib/format';
import { promoWeekdaysLabel } from '@/lib/booking';

interface StepServiceProps {
  services: Service[];
  selectedId: string | null;
  onSelect: (service: Service) => void;
}

function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: (service: Service) => void;
}) {
  const hasPromo = Boolean(service.promo_enabled && service.promo_price != null);
  const promoLabel = hasPromo ? promoWeekdaysLabel(service.promo_weekdays) : '';
  const promoLabelCap = promoLabel ? promoLabel.charAt(0).toUpperCase() + promoLabel.slice(1) : '';
  const showListPrice =
    hasPromo && !service.promo_only && Number(service.price) > Number(service.promo_price);
  const twoPeople = Number(service.participants_count) > 1;
  const displayPrice = hasPromo ? Number(service.promo_price) : Number(service.price);

  return (
    <button
      type="button"
      onClick={() => onSelect(service)}
      className={`text-left rounded-lg border p-4 md:p-5 transition-colors flex flex-col ${
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-background-200 bg-background-50 hover:border-primary-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-lg text-foreground-950">{service.name}</p>
          <p className="mt-1 text-sm text-foreground-600 leading-relaxed">
            {service.description || 'Atendimento profissional e individual.'}
          </p>
        </div>
        <span
          className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${
            selected ? 'bg-primary-500 border-primary-500 text-foreground-950' : 'border-background-300'
          }`}
        >
          {selected && <i className="ri-check-line text-sm" />}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-foreground-800">
          <i className="ri-time-line text-primary-600" /> {service.duration_minutes} min
        </span>
        <span className="inline-flex items-baseline gap-2">
          {showListPrice && (
            <span className="text-xs text-foreground-400 line-through">{formatBRL(service.price)}</span>
          )}
          <span className="font-semibold text-foreground-950">{formatBRL(displayPrice)}</span>
        </span>
        {twoPeople && (
          <span className="inline-flex items-center gap-1.5 text-foreground-700">
            <i className="ri-group-line text-primary-600" /> dois cortes no mesmo agendamento
          </span>
        )}
      </div>

      {hasPromo && promoLabelCap && (
        <p className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full border border-accent-200 bg-accent-100 px-3 py-1 text-xs text-accent-800">
          <i className="ri-price-tag-3-line" />
          {service.promo_only ? `Promoção exclusiva de ${promoLabel}.` : `${promoLabelCap} — preço promocional.`}
        </p>
      )}
    </button>
  );
}

export default function StepService({ services, selectedId, onSelect }: StepServiceProps) {
  const individuals = services.filter((s) => !s.promo_only);
  const promotions = services.filter((s) => s.promo_only);

  return (
    <div>
      <div>
        <h2 className="font-heading text-2xl md:text-3xl text-foreground-950">Escolha seu serviço</h2>
        <p className="mt-2 text-sm text-foreground-600">
          Corte, barba e degradê estão disponíveis de segunda a sábado. O valor final é aplicado conforme a data escolhida.
        </p>

        {individuals.length === 0 ? (
          <p className="mt-6 text-sm text-foreground-500">Nenhum serviço individual disponível no momento.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {individuals.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={service.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>

      {promotions.length > 0 && (
        <div className="mt-10">
          <h2 className="font-heading text-2xl md:text-3xl text-foreground-950">Promoções de segunda a quarta</h2>
          <p className="mt-2 text-sm text-foreground-600">
            Aproveite nossos pacotes especiais e reserve seu horário.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {promotions.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={service.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}