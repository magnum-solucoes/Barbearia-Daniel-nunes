interface BookingStepperProps {
  steps: string[];
  current: number;
}

export default function BookingStepper({ steps, current }: BookingStepperProps) {
  const progress = Math.round(((current + 1) / steps.length) * 100);

  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden md:flex items-center w-full">
        {steps.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold border transition-colors ${
                    done
                      ? 'bg-primary-500 border-primary-500 text-foreground-950'
                      : active
                        ? 'bg-foreground-950 border-foreground-950 text-primary-300'
                        : 'bg-background-100 border-background-300 text-foreground-500'
                  }`}
                >
                  {done ? <i className="ri-check-line" /> : index + 1}
                </span>
                <span
                  className={`text-sm whitespace-nowrap ${
                    active ? 'text-foreground-950 font-semibold' : done ? 'text-foreground-700' : 'text-foreground-500'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  className={`flex-1 h-px mx-3 ${done ? 'bg-primary-400' : 'bg-background-300'}`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-center justify-between text-xs text-foreground-600 mb-2">
          <span className="tracking-[0.2em] uppercase">Etapa {current + 1} de {steps.length}</span>
          <span className="text-foreground-950 font-semibold">{steps[current]}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-background-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}