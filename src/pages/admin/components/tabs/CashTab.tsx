import { useMemo, useState } from 'react';
import { adminAddCashEntry, adminDeleteCashEntry } from '@/lib/admin';
import { addDays, todayInTz, weekdayOf } from '@/lib/booking';
import { formatBRL } from '@/lib/format';
import { useAdminAppointments, useAdminCash } from '@/hooks/useAdminData';
import type { CashEntry } from '@/types/barber';
import { Button, EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, Notice, SectionHeading, Select, TextInput } from '../ui';

type PeriodKey = 'today' | 'week' | 'month' | 'all';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'all', label: 'Tudo' },
];

const METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit: 'Débito',
  credit: 'Crédito',
  other: 'Outro',
};

interface CashTabProps {
  timeZone: string;
}

export default function CashTab({ timeZone }: CashTabProps) {
  const { entries, loading, error, reload } = useAdminCash();
  const { appointments } = useAdminAppointments();

  const [period, setPeriod] = useState<PeriodKey>('today');
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('pix');
  const [appointmentId, setAppointmentId] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const today = todayInTz(timeZone);

  const periodStart = useMemo(() => {
    if (period === 'today') return today;
    if (period === 'week') {
      const offset = (weekdayOf(today, timeZone) + 6) % 7;
      return addDays(today, -offset, timeZone);
    }
    if (period === 'month') return `${today.slice(0, 7)}-01`;
    return '';
  }, [period, today, timeZone]);

  const filtered = useMemo(() => {
    const list = entries.filter((e) => {
      if (period === 'all') return true;
      if (period === 'month') return e.entry_date.slice(0, 7) === today.slice(0, 7);
      return e.entry_date >= periodStart && e.entry_date <= today;
    });
    return list.slice().sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  }, [entries, period, periodStart, today]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of filtered) {
      const v = Number(e.amount);
      if (e.type === 'income') income += v;
      else expense += v;
    }
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const openForm = (nextType: 'income' | 'expense') => {
    setType(nextType);
    setAmount('');
    setMethod('pix');
    setAppointmentId('');
    setDescription('');
    setEntryDate(today);
    setFormError(null);
    setOpen(true);
  };

  const handleSubmit = async () => {
    const value = Number(amount.replace(',', '.'));
    setFormError(null);
    if (!Number.isFinite(value) || value <= 0) return setFormError('Informe um valor maior que zero.');
    if (type === 'expense' && appointmentId) return setFormError('Despesas não devem ser vinculadas a um atendimento.');

    setSubmitting(true);
    const res = await adminAddCashEntry({
      type,
      amount: value,
      method: type === 'income' ? method : null,
      appointmentId: appointmentId || null,
      description: description.trim() || null,
      entryDate,
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(res.message);
      return;
    }
    setNotice({ kind: 'success', message: type === 'income' ? 'Entrada registrada.' : 'Despesa registrada.' });
    setOpen(false);
    reload();
  };

  const handleDelete = async (entry: CashEntry) => {
    setBusyId(entry.id);
    const res = await adminDeleteCashEntry(entry.id);
    setBusyId(null);
    if (!res.ok) {
      setNotice({ kind: 'error', message: res.message });
      return;
    }
    setNotice({ kind: 'success', message: 'Lançamento excluído.' });
    reload();
  };

  const linkableAppointments = appointments.filter((a) => a.status !== 'cancelled').slice(0, 80);

  return (
    <div>
      <SectionHeading
        title="Caixa"
        subtitle="Entradas, saídas, pagamentos parciais e saldo."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon="ri-add-line" onClick={() => openForm('income')}>Entrada</Button>
            <Button variant="ghost" icon="ri-subtract-line" onClick={() => openForm('expense')}>Despesa</Button>
          </div>
        }
      />

      {notice && <Notice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs uppercase tracking-wider text-foreground-500">Entradas</p>
          <p className="mt-1 font-heading text-2xl text-primary-700">{formatBRL(totals.income)}</p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs uppercase tracking-wider text-foreground-500">Saídas</p>
          <p className="mt-1 font-heading text-2xl text-accent-700">{formatBRL(totals.expense)}</p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs uppercase tracking-wider text-foreground-500">Saldo</p>
          <p className="mt-1 font-heading text-2xl text-foreground-950">{formatBRL(totals.balance)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
              period === p.key
                ? 'bg-foreground-950 border-foreground-950 text-background-50 font-semibold'
                : 'border-background-300 text-foreground-700 hover:border-primary-400'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock label="Carregando caixa..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyBlock message="Nenhum lançamento neste período." icon="ri-wallet-3-line" />
      ) : (
        <div className="rounded-lg border border-background-200 bg-background-50 overflow-hidden">
          <div className="divide-y divide-background-200">
            {filtered.map((e) => {
              const isIncome = e.type === 'income';
              const linked = appointments.find((a) => a.id === e.appointment_id);
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${isIncome ? 'bg-primary-100 text-primary-800' : 'bg-accent-100 text-accent-800'}`}>
                      <i className={isIncome ? 'ri-arrow-down-line' : 'ri-arrow-up-line'} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground-900 truncate">
                        {e.description || (isIncome ? 'Entrada' : 'Despesa')}
                      </p>
                      <p className="text-xs text-foreground-500 flex flex-wrap gap-x-3">
                        <span>{e.entry_date}</span>
                        {e.method && <span>{METHOD_LABELS[e.method] || e.method}</span>}
                        {linked && <span className="truncate">· {linked.client_name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-semibold ${isIncome ? 'text-primary-700' : 'text-accent-700'}`}>
                      {isIncome ? '+' : '−'} {formatBRL(e.amount)}
                    </span>
                    <button
                      type="button"
                      title="Excluir"
                      aria-label="Excluir"
                      disabled={busyId === e.id}
                      onClick={() => handleDelete(e)}
                      className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:border-accent-400 text-foreground-600 disabled:opacity-40"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={type === 'income' ? 'Nova entrada' : 'Nova despesa'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" icon="ri-save-line" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        {formError && <Notice kind="error" message={formError} onClose={() => setFormError(null)} />}
        <div className="space-y-4">
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')}>
              <option value="income">Entrada</option>
              <option value="expense">Despesa</option>
            </Select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Valor">
              <TextInput inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </Field>
            <Field label="Data">
              <TextInput type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </Field>
          </div>
          {type === 'income' && (
            <Field label="Forma de pagamento">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
          )}
          {type === 'income' && (
            <Field label="Vincular a um atendimento (opcional)" hint="O sistema impede registrar pagamento acima do valor devido.">
              <Select value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}>
                <option value="">Sem vínculo</option>
                {linkableAppointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.client_name} · {a.service_name_snapshot} · {formatBRL(a.service_price_snapshot)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Descrição (opcional)">
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}