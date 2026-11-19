import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminAppointments, useAdminBlocks } from '@/hooks/useAdminData';
import { instantDate, todayInTz } from '@/lib/booking';
import { hhmm } from '@/lib/format';
import { Button, EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, Notice, SectionHeading, TextArea, TextInput } from '../ui';

interface BlocksTabProps {
  timeZone: string;
}

export default function BlocksTab({ timeZone }: BlocksTabProps) {
  const { blocks, loading, error, reload } = useAdminBlocks();
  const { appointments } = useAdminAppointments();

  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [wholeDay, setWholeDay] = useState(true);
  const [blockDate, setBlockDate] = useState(todayInTz(timeZone));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openForm = () => {
    setWholeDay(true);
    setBlockDate(todayInTz(timeZone));
    setStartTime('');
    setEndTime('');
    setReason('');
    setNotice(null);
    setOpen(true);
  };

  const conflictsFor = (date: string) =>
    appointments.filter((a) => a.status !== 'cancelled' && instantDate(a.start_at, timeZone) === date).length;

  const handleSave = async () => {
    setNotice(null);
    if (!blockDate) return setNotice({ kind: 'error', message: 'Informe a data do bloqueio.' });
    if (!wholeDay) {
      if (!startTime || !endTime) return setNotice({ kind: 'error', message: 'Informe início e fim, ou marque dia inteiro.' });
      if (endTime <= startTime) return setNotice({ kind: 'error', message: 'O fim deve ser após o início.' });
    }

    setSaving(true);
    const { error: err } = await supabase.from('blocked_slots').insert({
      block_date: blockDate,
      start_time: wholeDay ? null : startTime,
      end_time: wholeDay ? null : endTime,
      reason: reason.trim() || null,
    });
    setSaving(false);
    if (err) return setNotice({ kind: 'error', message: 'Não foi possível criar o bloqueio.' });

    const existing = conflictsFor(blockDate);
    setOpen(false);
    setNotice({
      kind: 'success',
      message: existing > 0
        ? `Bloqueio criado. Atenção: existem ${existing} agendamento(s) nesse dia que podem conflitar.`
        : 'Bloqueio criado.',
    });
    reload();
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    const { error: err } = await supabase.from('blocked_slots').delete().eq('id', id);
    setBusyId(null);
    if (err) return setNotice({ kind: 'error', message: 'Não foi possível remover o bloqueio.' });
    setNotice({ kind: 'success', message: 'Bloqueio removido.' });
    reload();
  };

  return (
    <div>
      <SectionHeading
        title="Bloqueios"
        subtitle="Bloqueie um horário, um intervalo ou o dia inteiro. Reservas existentes não são apagadas."
        action={<Button variant="primary" icon="ri-forbid-line" onClick={openForm}>Novo bloqueio</Button>}
      />

      {notice && <Notice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}

      {loading ? (
        <LoadingBlock label="Carregando bloqueios..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : blocks.length === 0 ? (
        <EmptyBlock message="Nenhum bloqueio cadastrado." icon="ri-forbid-line" />
      ) : (
        <div className="rounded-lg border border-background-200 bg-background-50 overflow-hidden">
          <div className="divide-y divide-background-200">
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground-900">
                    {b.block_date} · {b.start_time && b.end_time ? `${hhmm(b.start_time)} – ${hhmm(b.end_time)}` : 'Dia inteiro'}
                  </p>
                  {b.reason && <p className="text-xs text-foreground-500 mt-0.5">{b.reason}</p>}
                </div>
                <button
                  type="button"
                  title="Remover"
                  aria-label="Remover"
                  disabled={busyId === b.id}
                  onClick={() => handleDelete(b.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:border-accent-400 text-foreground-600 disabled:opacity-40"
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo bloqueio"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="primary" icon="ri-save-line" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Criar bloqueio'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Data">
            <TextInput type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
          </Field>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={wholeDay} onChange={(e) => setWholeDay(e.target.checked)} className="w-4 h-4 accent-primary-500" />
            <span className="text-sm text-foreground-800">Bloquear o dia inteiro</span>
          </label>
          {!wholeDay && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Início">
                <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </Field>
              <Field label="Fim">
                <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Field>
            </div>
          )}
          <Field label="Motivo (opcional)">
            <TextArea rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}