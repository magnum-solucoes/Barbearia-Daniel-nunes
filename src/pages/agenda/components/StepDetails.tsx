import { onlyDigits } from '@/lib/format';

export interface DetailsValues {
  /** One entry per person. Index 0 is the main contact name. */
  participants: string[];
  phone: string;
  notes: string;
}

interface StepDetailsProps {
  values: DetailsValues;
  errors: { participants?: (string | undefined)[]; phone?: string };
  /** Labels for each participant (length == participants_count). */
  labels: string[];
  onParticipantChange: (index: number, value: string) => void;
  onPhoneChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

function formatPhoneInput(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function StepDetails({
  values,
  errors,
  labels,
  onParticipantChange,
  onPhoneChange,
  onNotesChange,
}: StepDetailsProps) {
  const many = values.participants.length > 1;

  return (
    <div>
      <h2 className="font-heading text-2xl md:text-3xl text-foreground-950">Seus dados</h2>
      <p className="mt-2 text-sm text-foreground-600">
        {many
          ? 'Informe o nome de cada participante do pacote e um WhatsApp de contato.'
          : 'Precisamos do seu nome e WhatsApp para confirmar o atendimento.'}
      </p>

      <div className="mt-7 space-y-5 max-w-xl">
        {values.participants.map((value, index) => {
          const label = labels[index] || (index === 0 ? 'Nome completo' : `Participante ${index + 1}`);
          const error = errors.participants?.[index];
          return (
            <div key={label}>
              <label htmlFor={`participant-${index}`} className="block text-sm font-medium text-foreground-800 mb-1.5">
                {label} <span className="text-accent-600">*</span>
              </label>
              <input
                id={`participant-${index}`}
                name={`participant_${index}`}
                type="text"
                autoComplete={index === 0 ? 'name' : 'off'}
                value={value}
                onChange={(e) => onParticipantChange(index, e.target.value)}
                placeholder={index === 0 ? 'Ex.: João da Silva' : 'Ex.: Pedro da Silva'}
                className={`w-full rounded-md border bg-background-50 px-4 py-3 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 ${
                  error ? 'border-accent-500' : 'border-background-300'
                }`}
              />
              {error && <p className="mt-1.5 text-xs text-accent-700">{error}</p>}
            </div>
          );
        })}

        <div>
          <label htmlFor="client-phone" className="block text-sm font-medium text-foreground-800 mb-1.5">
            WhatsApp de contato (com DDD) <span className="text-accent-600">*</span>
          </label>
          <input
            id="client-phone"
            name="client_phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => onPhoneChange(formatPhoneInput(e.target.value))}
            placeholder="(67) 99999-9999"
            className={`w-full rounded-md border bg-background-50 px-4 py-3 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 ${
              errors.phone ? 'border-accent-500' : 'border-background-300'
            }`}
          />
          {errors.phone && <p className="mt-1.5 text-xs text-accent-700">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="client-notes" className="block text-sm font-medium text-foreground-800 mb-1.5">
            Observações <span className="text-foreground-400">(opcional)</span>
          </label>
          <textarea
            id="client-notes"
            name="client_notes"
            rows={3}
            maxLength={500}
            value={values.notes}
            onChange={(e) => onNotesChange(e.target.value.slice(0, 500))}
            placeholder="Alguma preferência ou observação para o atendimento?"
            className="w-full rounded-md border border-background-300 bg-background-50 px-4 py-3 text-sm text-foreground-950 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
          />
          <p className="mt-1.5 text-xs text-foreground-500 text-right">{values.notes.length}/500</p>
        </div>
      </div>
    </div>
  );
}