import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adminAddCashEntry } from '@/lib/admin';
import { todayInTz } from '@/lib/booking';
import { formatBRL } from '@/lib/format';
import type { Appointment } from '@/types/barber';
import { Button, Field, Modal, Notice, Select, TextInput } from '../ui';

const METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'other', label: 'Outro' },
];

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  timeZone: string;
  onSuccess: (message: string) => void;
}

export default function PaymentModal({ open, onClose, appointment, timeZone, onSuccess }: PaymentModalProps) {
  const [paid, setPaid] = useState(0);
  const [productDue, setProductDue] = useState(0);
  const [loadingPaid, setLoadingPaid] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('pix');
  const [entryDate, setEntryDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const due = (Number(appointment?.service_price_snapshot) || 0) + productDue;
  const remaining = Math.max(0, Math.round((due - paid) * 100) / 100);

  const loadPaid = useCallback(async () => {
    if (!appointment) return;
    setLoadingPaid(true);
    try {
      const { data } = await supabase
        .from('cash_entries')
        .select('amount')
        .eq('type', 'income')
        .eq('appointment_id', appointment.id);
      const sum = (data || []).reduce((acc: number, row: { amount: number }) => acc + Number(row.amount), 0);
      setPaid(sum);

      const { data: prodRows } = await supabase
        .from('appointment_products')
        .select('product_price_snapshot, quantity')
        .eq('appointment_id', appointment.id)
        .eq('status', 'reserved');
      const productsTotal = (prodRows || []).reduce(
        (acc: number, row: { product_price_snapshot: number; quantity: number }) =>
          acc + Number(row.product_price_snapshot) * Number(row.quantity),
        0,
      );
      setProductDue(productsTotal);
    } catch {
      setPaid(0);
      setProductDue(0);
    } finally {
      setLoadingPaid(false);
    }
  }, [appointment]);

  useEffect(() => {
    if (open && appointment) {
      setMethod('pix');
      setEntryDate(todayInTz(timeZone));
      setDescription('');
      setError(null);
      loadPaid();
    }
  }, [open, appointment, timeZone, loadPaid]);

  useEffect(() => {
    if (open) setAmount(remaining > 0 ? String(remaining) : '');
  }, [open, remaining]);

  const handleSubmit = async () => {
    if (!appointment) return;
    const value = Number(amount.replace(',', '.'));
    setError(null);
    if (!Number.isFinite(value) || value <= 0) return setError('Informe um valor maior que zero.');

    setSubmitting(true);
    const res = await adminAddCashEntry({
      type: 'income',
      amount: value,
      method,
      appointmentId: appointment.id,
      description: description.trim() || `Pagamento · ${appointment.client_name}`,
      entryDate,
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.message);
      loadPaid();
      return;
    }
    onSuccess('Pagamento registrado no caixa.');
    onClose();
  };

  if (!appointment) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pagamento"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="ri-money-dollar-circle-line" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar'}
          </Button>
        </>
      }
    >
      {error && <Notice kind="error" message={error} onClose={() => setError(null)} />}

      <div className="rounded-md border border-background-200 bg-background-100 px-4 py-3 mb-5">
        <p className="text-sm text-foreground-800">{appointment.client_name} · {appointment.service_name_snapshot}</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-500">Devido</p>
            <p className="text-sm font-semibold text-foreground-950">{formatBRL(due)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-500">Pago</p>
            <p className="text-sm font-semibold text-foreground-950">{loadingPaid ? '...' : formatBRL(paid)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-500">Restante</p>
            <p className="text-sm font-semibold text-primary-700">{formatBRL(remaining)}</p>
          </div>
        </div>
      </div>

      {remaining <= 0 ? (
        <p className="text-sm text-foreground-600">Este atendimento já está totalmente pago.</p>
      ) : (
        <div className="space-y-4">
          <Field label="Valor recebido" hint={`Máximo permitido: ${formatBRL(remaining)}`}>
            <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Forma de pagamento">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Data">
              <TextInput type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Descrição (opcional)">
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: pagamento parcial" />
          </Field>
        </div>
      )}
    </Modal>
  );
}