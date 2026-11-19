import { formatBRL } from '@/lib/format';
import type { BookingProduct, Service } from '@/types/barber';

interface StepExtrasProps {
  service: Service;
  /** Price resolved for the selected date (weekday promo aware). */
  servicePrice?: number;
  products: BookingProduct[];
  loading: boolean;
  error: string | null;
  selected: Record<string, number>;
  onToggle: (product: BookingProduct) => void;
  onReload: () => void;
}

function AddonCard({
  product,
  added,
  onToggle,
}: {
  product: BookingProduct;
  added: boolean;
  onToggle: (product: BookingProduct) => void;
}) {
  const isService = product.kind === 'service';
  const extraMinutes = Number(product.duration_minutes) || 0;

  return (
    <article
      className={`rounded-lg border bg-background-50 overflow-hidden flex flex-col transition-colors ${
        added ? 'border-primary-500' : 'border-background-200'
      }`}
    >
      <div className="w-full h-40 overflow-hidden bg-foreground-950 relative">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            title={`${product.name} — Barbearia Daniel Nunes`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary-400">
            <span className="w-14 h-14 flex items-center justify-center text-3xl">
              <i className={isService ? 'ri-scissors-2-line' : 'ri-shopping-bag-3-line'} />
            </span>
          </div>
        )}
        {isService && extraMinutes > 0 && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-foreground-950/85 px-3 py-1 text-xs text-primary-300">
            <i className="ri-time-line" /> +{extraMinutes} min
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="font-heading text-lg text-foreground-950">{product.name}</p>
        <p className="mt-1 text-sm text-foreground-600 leading-relaxed flex-1">
          {product.description || (isService ? 'Acabamento adicional para o seu visual.' : 'Adicional para finalizar o visual.')}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="font-semibold text-foreground-950">{formatBRL(product.price)}</span>
          <button
            type="button"
            onClick={() => onToggle(product)}
            title={added ? 'Remover adicional' : 'Adicionar adicional'}
            className={`whitespace-nowrap inline-flex items-center gap-2 rounded-md text-sm font-semibold px-4 py-2 transition-colors ${
              added
                ? 'bg-foreground-950 text-primary-300 hover:bg-foreground-800'
                : 'bg-primary-500 hover:bg-primary-600 text-foreground-950'
            }`}
          >
            <i className={added ? 'ri-check-line' : 'ri-add-line'} />
            {added ? 'Adicionado ✓' : 'Adicionar'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function StepExtras({
  service,
  servicePrice,
  products,
  loading,
  error,
  selected,
  onToggle,
  onReload,
}: StepExtrasProps) {
  const basePrice = typeof servicePrice === 'number' ? servicePrice : Number(service.price);
  const baseDuration = Number(service.duration_minutes) || 0;

  const lines = products
    .filter((p) => selected[p.id])
    .map((p) => ({
      name: p.name,
      price: Number(p.price) * selected[p.id],
      qty: selected[p.id],
      duration: (Number(p.duration_minutes) || 0) * selected[p.id],
    }));
  const productsTotal = lines.reduce((sum, l) => sum + l.price, 0);
  const addonDuration = lines.reduce((sum, l) => sum + l.duration, 0);
  const total = basePrice + productsTotal;
  const totalDuration = baseDuration + addonDuration;

  const catalogProducts = products.filter((p) => p.kind !== 'service');
  const catalogServices = products.filter((p) => p.kind === 'service');

  const renderGrid = (items: BookingProduct[]) => (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((product) => (
        <AddonCard key={product.id} product={product} added={Boolean(selected[product.id])} onToggle={onToggle} />
      ))}
    </div>
  );

  return (
    <div>
      <h2 className="font-heading text-2xl md:text-3xl text-foreground-950">
        Antes de continuar, dá uma olhada nos nossos produtos! 👀
      </h2>
      <p className="mt-3 text-sm md:text-base text-foreground-600 leading-relaxed max-w-2xl">
        Vai precisar de um gel ou de uma pomada para manter o visual em dia? Aproveite também para dar aquele
        acabamento nas sobrancelhas!
      </p>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 py-10 text-foreground-600 text-sm">
          <i className="ri-loader-4-line animate-spin" /> Carregando adicionais...
        </div>
      ) : error ? (
        <div className="mt-7 rounded-lg border border-accent-200 bg-accent-50 p-5 text-center">
          <p className="text-sm text-accent-800">{error}</p>
          <button
            type="button"
            onClick={onReload}
            className="mt-3 whitespace-nowrap rounded-md bg-foreground-950 text-background-50 text-sm font-semibold px-4 py-2 inline-flex items-center gap-2"
          >
            <i className="ri-refresh-line" /> Tentar novamente
          </button>
        </div>
      ) : products.length === 0 ? (
        <p className="mt-7 text-sm text-foreground-500">
          Nenhum adicional disponível no momento. É só continuar com o agendamento.
        </p>
      ) : (
        <>
          {catalogProducts.length > 0 && (
            <div className="mt-8">
              <h3 className="font-heading text-lg text-foreground-950 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center text-primary-600">
                  <i className="ri-shopping-bag-3-line" />
                </span>
                Produtos
              </h3>
              <p className="mt-1 text-sm text-foreground-600">Para levar o visual em dia para casa.</p>
              {renderGrid(catalogProducts)}
            </div>
          )}

          {catalogServices.length > 0 && (
            <div className="mt-10">
              <h3 className="font-heading text-lg text-foreground-950 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center text-primary-600">
                  <i className="ri-scissors-2-line" />
                </span>
                Serviços adicionais
              </h3>
              <p className="mt-1 text-sm text-foreground-600">
                Realizados na hora e acrescentados ao seu tempo de atendimento.
              </p>
              {renderGrid(catalogServices)}
            </div>
          )}
        </>
      )}

      {/* Resumo do total em tempo real — em fluxo, sem sobrepor os cards nem o botão Continuar */}
      <div className="mt-7 rounded-lg border border-background-200 bg-background-50 overflow-hidden">
        <div className="flex items-center justify-between gap-4 bg-foreground-950 px-5 py-3.5">
          <span className="text-xs uppercase tracking-[0.2em] text-primary-300">Total</span>
          <span className="font-heading text-2xl text-primary-300">{formatBRL(total)}</span>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-foreground-700 truncate">{service.name}</span>
            <span className="shrink-0 font-medium text-foreground-950">{formatBRL(basePrice)}</span>
          </div>
          {lines.map((l) => (
            <div key={l.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-foreground-700 truncate">
                {l.name}
                {l.qty > 1 ? ` ×${l.qty}` : ''}
              </span>
              <span className="shrink-0 font-medium text-foreground-950">{formatBRL(l.price)}</span>
            </div>
          ))}
          {lines.length === 0 && (
            <p className="text-xs text-foreground-500">
              Nenhum adicional selecionado até agora — você pode continuar assim.
            </p>
          )}
          <div className="flex items-center justify-between gap-4 border-t border-background-200 pt-2.5 text-sm">
            <span className="text-foreground-600 inline-flex items-center gap-1.5">
              <i className="ri-time-line text-primary-600" /> Duração total do atendimento
            </span>
            <span className="shrink-0 font-medium text-foreground-950">{totalDuration} min</span>
          </div>
          <p className="pt-1 text-[11px] leading-relaxed text-foreground-500">
            Os adicionais são pagos diretamente na barbearia. Serviços adicionais acrescentam tempo ao seu
            atendimento.
          </p>
        </div>
      </div>
    </div>
  );
}