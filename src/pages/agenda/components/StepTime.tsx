interface StepTimeProps {
  dateLabel: string;
  durationMinutes: number;
  loading: boolean;
  error: string | null;
  closed: boolean;
  reason: string | null;
  slots: string[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  onReload: () => void;
}

function reasonMessage(reason: string | null): string {
  switch (reason) {
    case 'WEEKDAY_CLOSED':
      return 'A barbearia está fechada neste dia. Escolha outra data.';
    case 'DAY_BLOCKED':
      return 'Este dia não está disponível para agendamento. Escolha outra data.';
    case 'OUT_OF_WINDOW':
      return 'Esta data está fora do período permitido para agendamento.';
    case 'PROMO_ONLY':
      return 'Este serviço só está disponível nos dias da promoção (segunda a quarta). Escolha uma data promocional ou outro serviço.';
    default:
      return 'Não há horários disponíveis para esta data.';
  }
}

export default function StepTime({
  dateLabel,
  durationMinutes,
  loading,
  error,
  closed,
  reason,
  slots,
  selectedTime,
  onSelect,
  onReload,
}: StepTimeProps) {
  return (
    <div>
      <h2 className="font-heading text-2xl md:text-3xl text-foreground-950">Escolha o horário</h2>
      <p className="mt-2 text-sm text-foreground-600">
        <span className="capitalize">{dateLabel}</span> · duração de {durationMinutes} min
      </p>

      {loading && (
        <div className="mt-8 flex flex-col items-center justify-center py-12 text-foreground-600">
          <i className="ri-loader-4-line text-2xl animate-spin" />
          <p className="mt-3 text-sm">Buscando horários disponíveis...</p>
        </div>
      )}

      {!loading && error && (
        <div className="mt-8 rounded-lg border border-accent-200 bg-accent-50 p-5 text-center">
          <i className="ri-error-warning-line text-2xl text-accent-700" />
          <p className="mt-2 text-sm text-accent-800">{error}</p>
          <button
            type="button"
            onClick={onReload}
            className="mt-4 whitespace-nowrap rounded-md bg-foreground-950 text-background-50 text-sm font-semibold px-5 py-2.5 inline-flex items-center gap-2"
          >
            <i className="ri-refresh-line" /> Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && closed && (
        <div className="mt-8 rounded-lg border border-background-200 bg-background-100 p-6 text-center">
          <i className="ri-calendar-close-line text-2xl text-foreground-500" />
          <p className="mt-2 text-sm text-foreground-700">{reasonMessage(reason)}</p>
        </div>
      )}

      {!loading && !error && !closed && slots.length === 0 && (
        <div className="mt-8 rounded-lg border border-background-200 bg-background-100 p-6 text-center">
          <i className="ri-time-line text-2xl text-foreground-500" />
          <p className="mt-2 text-sm text-foreground-700">
            Todos os horários desta data já foram preenchidos. Escolha outra data.
          </p>
        </div>
      )}

      {!loading && !error && !closed && slots.length > 0 && (
        <>
          <div className="mt-7 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {slots.map((time) => {
              const selected = time === selectedTime;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => onSelect(time)}
                  className={`rounded-md py-2.5 text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-primary-500 text-foreground-950'
                      : 'bg-background-100 text-foreground-900 border border-background-200 hover:border-primary-400'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-foreground-500 flex items-center gap-2">
            <i className="ri-information-line" /> {slots.length} horário(s) disponível(is) nesta data.
          </p>
        </>
      )}
    </div>
  );
}