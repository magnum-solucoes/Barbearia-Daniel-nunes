import { useCallback, useEffect, useState } from 'react';
import { adminAvailability, adminCreateBooking } from '@/lib/admin';
import { todayInTz } from '@/lib/booking';
import { onlyDigits } from '@/lib/format';
import { formatBRL } from '@/lib/format';
import type { BookingProduct, Service } from '@/types/barber';
import { Button, Field, Modal, Notice, Select, TextArea, TextInput } from '../ui';

interface ManualBookingModalProps {
  open: boolean;
  onClose: () => void;
  services: Service[];
  products: BookingProduct[];
  timeZone: string;
  onSuccess: (message: string) => void;
}

export default function ManualBookingModal({ open, onClose, services, products, timeZone, onSuccess }: ManualBookingModalProps) {
  const activeServices = services.filter((s) => s.active);
  const activeProducts = products.filter((p) => p.active);
  const [serviceId, setServiceId] = useState('');
  const [secondName, setSecondName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayInTz(timeZone);

  const selectedService = activeServices.find((s) => s.id === serviceId);
  const participantsCount = Number(selectedService?.participants_count) || 1;
  const participantLabels = selectedService?.participant_labels || [];
  const firstLabel = participantsCount > 1 ? participantLabels[0] || 'Nome do primeiro participante' : 'Nome do cliente';
  const secondLabel = participantLabels[1] || 'Nome do segundo participante';

  useEffect(() => {
    if (open) {
      setServiceId('');
      setDate(today);
      setTime('');
      setSlots([]);
      setClosedReason(null);
      setName('');
      setSecondName('');
      setPhone('');
      setNotes('');
      setStatus('pending');
      setExtraQty({});
      setError(null);
    }
  }, [open, today]);

  const loadSlots = useCallback(async () => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setClosedReason(null);
    const result = await adminAvailability(serviceId, date);
    setLoadingSlots(false);
    if (!result.ok) {
      setError(result.message);
      setSlots([]);
      return;
    }
    setError(null);
    setTime('');
    setSlots(result.data.slots);
    setClosedReason(result.data.closed ? result.data.reason : null);
  }, [serviceId, date]);

  useEffect(() => {
    if (open) loadSlots();
  }, [open, loadSlots]);

  const handleSubmit = async () => {
    setError(null);
    if (!serviceId) return setError('Selecione um serviço.');
    if (!date) return setError('Selecione a data.');
    if (!time) return setError('Selecione um horário.');
    if (name.trim().length < 2) return setError('Informe o nome do cliente.');
    if (participantsCount > 1 && secondName.trim().length < 2) return setError('Informe o nome do segundo participante.');
    const digits = onlyDigits(phone);
    if (digits.length < 10 || digits.length > 13) return setError('Informe um telefone válido com DDD.');

    setSubmitting(true);
    const result = await adminCreateBooking({
      serviceId,
      date,
      time,
      clientName: name.trim(),
      clientPhone: digits,
      notes: notes.trim(),
      status,
      products: Object.entries(extraQty).map(([product_id, quantity]) => ({ product_id, quantity })),
      participants: participantsCount > 1 ? [name.trim(), secondName.trim()] : [],
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      if (result.code === 'SLOT_TAKEN' || result.code === 'BLOCKED' || result.code === 'OUT_OF_HOURS') {
        loadSlots();
      }
      return;
    }
    onSuccess('Agendamento criado com sucesso.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova reserva manual"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="ri-add-line" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar agendamento'}
          </Button>
        </>
      }
    >
      {error && <Notice kind="error" message={error} onClose={() => setError(null)} />}

      <div className="space-y-4">
        <Field label="Serviço">
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Selecione o serviço</option>
            {activeServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.duration_minutes} min
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Data">
            <TextInput type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Telefone / WhatsApp">
            <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(67) 99999-9999" />
          </Field>
        </div>

        <Field label="Horário">
          {loadingSlots ? (
            <p className="text-sm text-foreground-500 flex items-center gap-2"><i className="ri-loader-4-line animate-spin" /> Carregando horários...</p>
          ) : closedReason ? (
            <p className="text-sm text-accent-700">
              {closedReason === 'DAY_BLOCKED' ? 'Este dia está bloqueado.' : 'A barbearia está fechada nesse dia.'}
            </p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-foreground-500">Selecione um serviço e uma data para ver os horários.</p>
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

        <Field label={firstLabel}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
        </Field>

        {participantsCount > 1 && (
          <Field label={secondLabel}>
            <TextInput value={secondName} onChange={(e) => setSecondName(e.target.value)} placeholder="Nome completo" />
          </Field>
        )}

        <Field label="Observações (opcional)">
          <TextArea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {activeProducts.length > 0 && (
          <Field label="Adicionais (opcional)">
            <div className="space-y-2">
              {activeProducts.map((p) => {
                const added = Boolean(extraQty[p.id]);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setExtraQty((prev) => {
                        const next = { ...prev };
                        if (next[p.id]) delete next[p.id];
                        else next[p.id] = 1;
                        return next;
                      })
                    }
                    className={`w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                      added ? 'border-primary-500 bg-primary-50' : 'border-background-300 hover:border-primary-400'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground-900 truncate">{p.name}</span>
                      <span className="block text-xs text-foreground-600">{formatBRL(p.price)}</span>
                    </span>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold ${added ? 'text-primary-800' : 'text-foreground-500'}`}>
                      <i className={added ? 'ri-check-line' : 'ri-add-line'} />
                      {added ? 'Adicionado' : 'Adicionar'}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="Status inicial">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}