import type { BusinessHour } from '@/types/barber';
import { addDays, dayNumber, monthShort, weekdayOf } from '@/lib/booking';
import { WEEKDAYS_SHORT } from '@/lib/format';

interface StepDateProps {
  timeZone: string;
  hours: BusinessHour[];
  minDate: string;
  maxDate: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  promoNote?: string | null;
  /** When set, only these weekdays (0=Sun..6=Sat) can be selected. */
  allowedWeekdays?: number[] | null;
}

export default function StepDate({
  timeZone,
  hours,
  minDate,
  maxDate,
  selectedDate,
  onSelect,
  promoNote,
  allowedWeekdays,
}: StepDateProps) {
  const openByWeekday = new Map<number, boolean>();
  hours.forEach((h) => openByWeekday.set(h.weekday, h.is_open));
  const restricted = Array.isArray(allowedWeekdays) && allowedWeekdays.length > 0;

  const total = Math.max(0, Math.round((Date.parse(`${maxDate}T12:00:00Z`) - Date.parse(`${minDate}T12:00:00Z`)) / 86400000));
  const dates: string[] = [];
  for (let i = 0; i <= total; i += 1) {
    dates.push(addDays(minDate, i, timeZone));
  }

  const leading = weekdayOf(minDate, timeZone);
  const blanks = Array.from({ length: leading }, (_, i) => `blank-${i}`);

  return (
    <div>
      <h2 className="font-heading text-2xl md:text-3xl text-foreground-950">Escolha a data</h2>
      <p className="mt-2 text-sm text-foreground-600">
        Agendamentos disponíveis até {total} dias à frente. Domingos a barbearia está fechada.
      </p>

      {promoNote && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-100 px-3 py-1.5 text-xs text-accent-800">
          <i className="ri-price-tag-3-line" /> {promoNote}
        </p>
      )}

      <div className="mt-6 rounded-lg border border-background-200 bg-background-50 p-3 md:p-5">
        <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-2">
          {WEEKDAYS_SHORT.map((wd) => (
            <span key={wd} className="text-center text-[11px] md:text-xs uppercase tracking-wide text-foreground-500">
              {wd}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {blanks.map((b) => (
            <span key={b} className="aspect-square" aria-hidden="true" />
          ))}
          {dates.map((date) => {
            const weekday = weekdayOf(date, timeZone);
            const open = openByWeekday.get(weekday) ?? false;
            const isOpen = open && (!restricted || (allowedWeekdays as number[]).includes(weekday));
            const selected = date === selectedDate;
            const isToday = date === minDate;
            const showMonth = date.slice(8, 10) === '01' || date === minDate;

            return (
              <button
                key={date}
                type="button"
                disabled={!isOpen}
                onClick={() => onSelect(date)}
                className={`relative aspect-square rounded-md flex flex-col items-center justify-center text-sm transition-colors ${
                  selected
                    ? 'bg-primary-500 text-foreground-950 font-semibold'
                    : isOpen
                      ? 'bg-background-100 text-foreground-900 hover:bg-primary-50 hover:border hover:border-primary-300'
                      : 'bg-background-100/50 text-foreground-400 cursor-not-allowed'
                }`}
              >
                <span>{dayNumber(date)}</span>
                {showMonth && (
                  <span className={`text-[9px] md:text-[10px] uppercase ${selected ? 'text-foreground-900' : 'text-foreground-500'}`}>
                    {monthShort(date, timeZone)}
                  </span>
                )}
                {isToday && !selected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-500" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-xs text-foreground-500 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-primary-500 inline-block" /> Hoje
        <span className="w-3 h-3 rounded-md bg-background-100 border border-background-300 inline-block ml-3" /> Disponível
        <span className="w-3 h-3 rounded-md bg-background-100/50 inline-block ml-3" /> Indisponível
      </p>
      {restricted && (
        <p className="mt-3 text-xs text-accent-800 flex items-center gap-2">
          <i className="ri-price-tag-3-line" /> Este pacote é oferecido apenas nos dias destacados (segunda a quarta).
        </p>
      )}
    </div>
  );
}