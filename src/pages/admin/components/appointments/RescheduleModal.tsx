import { useCallback, useEffect, useState } from 'react';
import { adminAvailability, adminReschedule, type RescheduleResult } from '@/lib/admin';
import { instantDate, makeIdempotencyKey, todayInTz } from '@/lib/booking';
import type { Appointment } from '@/types/barber';
import { Button, Field, Modal, Notice, TextInput } from '../ui';
import RescheduleSuccess from './RescheduleSuccess';

interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  timeZone: string;
  onSuccess: (message: string) => void;
}

export default function RescheduleModal({ open, onClose, appointment, timeZone, onSuccess }: RescheduleModalProps) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RescheduleResult | null>(null);

  const today = todayInTz(timeZone);

  useEffect(() => {
    if (open && appointment) {
      setDate(instantDate(appointment.start_at, timeZone));
      setTime('');
      setSlots([]);
      setClosedReason(null);
      setError(null);
      setResult(null);
    }
  }, [open, appointment, timeZone]);

  const loadSlots = useCallback(async () => {
    if (!appointment || !date) return;
    if (!appointment.service_id) {
      setError('Este atendimento não possui serviço vinculado para calcular a disponibilidade.');
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setClosedReason(null);
    const res = await adminAvailability(appointment.service_id, date, appointment.id);
    setLoadingSlots(false);
    if (!res.ok) {
      setError(res.message);
      setSlots([]);
      return;
    }
    setError(null);
    setTime('');
    setSlots(res.data.slots);
    setClosedReason(res.data.closed ? res.data.reason : null);
  }, [appointment, date]);

  useEffect(() => {
    if (open && date) loadSlots();
  }, [open, date, loadSlots]);

  const handleSubmit = async () => {
    if (!appointment) return;
    setError(null);
    if (!date) return setError('Selecione a data.');
    if (!time) return setError('Selecione o novo horário.');

    setSubmitting(true);
    const res = await adminReschedule(appointment.id, date, time, makeIdempotencyKey());
    setSubmitting(false);

    if (!res.ok) {
      setError(res.message);
      if (res.code === 'SLOT_TAKEN' || res.code === 'BLOCKED' || res.code === 'OUT_OF_HOURS') loadSlots();
      return;
    }
    setResult(res.data);
    onSuccess('Agendamento remarcado com sucesso.');
  };

  if (!appointment) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={result ? 'Remarcação concluída' : 'Remarcar agendamento'}
      footer={
        result ? undefined : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" icon="ri-calendar-2-line" onClick={handleSubmit} disabled={submitting || !time}>
              {submitting ? 'Remarcando...' : 'Confirmar remarcação'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <RescheduleSuccess appointment={result.appointment} previous={result.previous} timeZone={timeZone} onClose={onClose} />
      ) : (
        <>
          {error && <Notice kind="error" message={error} onClose={() => setError(null)} />}

          <div className="rounded-md border border-background-200 bg-background-100 px-4 py-3 mb-5">
            <p className="text-xs uppercase tracking-wider text-foreground-500">Atual</p>
            <p className="mt-0.5 text-sm text-foreground-800">
              {appointment.client_name} · {appointment.service_name_snapshot} · {appointment.service_duration_snapshot} min
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Nova data">
              <TextInput type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>

            <Field label="Novo horário">
              {loadingSlots ? (
                <p className="text-sm text-foreground-500 flex items-center gap-2"><i className="ri-loader-4-line animate-spin" /> Carregando horários...</p>
              ) : closedReason ? (
                <p className="text-sm text-accent-700">
                  {closedReason === 'DAY_BLOCKED' ? 'Este dia está bloqueado.' : 'A barbearia está fechada nesse dia.'}
                </p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-foreground-500">Nenhum horário livre nessa data.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        time === slot
                          ? 'bg-primary-500 border-primary-500 text-foreground-950 font-semibold'
                          : 'border-background-300 hover:border-primary-400 text-foreground-800'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </Field>
          </div>
        </>
      )}
    </Modal>
  );
}