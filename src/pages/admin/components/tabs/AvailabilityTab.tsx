import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { hhmm, WEEKDAYS_LABELS } from '@/lib/format';
import type { BusinessHour } from '@/types/barber';
import { Button, ErrorBlock, LoadingBlock, Notice, SectionHeading } from '../ui';

export default function AvailabilityTab() {
  const { hours, loading, error, reload } = useBusinessHours();
  const [rows, setRows] = useState<BusinessHour[]>([]);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    setRows(hours.slice().sort((a, b) => a.weekday - b.weekday));
  }, [hours]);

  const update = (id: string, patch: Partial<BusinessHour>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveRow = async (row: BusinessHour) => {
    setNotice(null);
    if (row.is_open) {
      if (!row.open_time || !row.close_time) {
        return setNotice({ kind: 'error', message: 'Defina abertura e fechamento.' });
      }
      if (row.close_time <= row.open_time) {
        return setNotice({ kind: 'error', message: 'O fechamento deve ser após a abertura.' });
      }
      if (row.break_start && row.break_end && row.break_end <= row.break_start) {
        return setNotice({ kind: 'error', message: 'O fim da pausa deve ser após o início.' });
      }
      if (row.break_start && !row.break_end) {
        return setNotice({ kind: 'error', message: 'Informe o fim da pausa ou limpe o início.' });
      }
      if (row.break_end && !row.break_start) {
        return setNotice({ kind: 'error', message: 'Informe o início da pausa ou limpe o fim.' });
      }
    }

    setSavingId(row.id);
    const { error: err } = await supabase
      .from('business_hours')
      .update({
        is_open: row.is_open,
        open_time: row.is_open ? row.open_time : null,
        close_time: row.is_open ? row.close_time : null,
        break_start: row.is_open ? row.break_start : null,
        break_end: row.is_open ? row.break_end : null,
      })
      .eq('id', row.id);
    setSavingId(null);
    if (err) return setNotice({ kind: 'error', message: 'Não foi possível salvar o horário.' });
    setNotice({ kind: 'success', message: `${WEEKDAYS_LABELS[row.weekday]}: horário salvo.` });
    reload();
  };

  return (
    <div>
      <SectionHeading title="Disponibilidade" subtitle="Dias, horários de funcionamento e intervalos por dia da semana." />

      {notice && <Notice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}

      {loading ? (
        <LoadingBlock label="Carregando disponibilidade..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-background-200 bg-background-50 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4 lg:w-56 shrink-0">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.is_open}
                      onChange={(e) => update(row.id, { is_open: e.target.checked })}
                      className="w-4 h-4 accent-primary-500"
                    />
                    <span className="font-heading text-base text-foreground-950">{WEEKDAYS_LABELS[row.weekday]}</span>
                  </label>
                </div>

                {row.is_open ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                    <label className="block">
                      <span className="block text-xs text-foreground-500 mb-1">Abertura</span>
                      <input type="time" value={hhmm(row.open_time)} onChange={(e) => update(row.id, { open_time: e.target.value })} className="w-full rounded-md border border-background-300 bg-background-50 px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-foreground-500 mb-1">Fechamento</span>
                      <input type="time" value={hhmm(row.close_time)} onChange={(e) => update(row.id, { close_time: e.target.value })} className="w-full rounded-md border border-background-300 bg-background-50 px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-foreground-500 mb-1">Pausa (início)</span>
                      <input type="time" value={hhmm(row.break_start)} onChange={(e) => update(row.id, { break_start: e.target.value || null })} className="w-full rounded-md border border-background-300 bg-background-50 px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="block text-xs text-foreground-500 mb-1">Pausa (fim)</span>
                      <input type="time" value={hhmm(row.break_end)} onChange={(e) => update(row.id, { break_end: e.target.value || null })} className="w-full rounded-md border border-background-300 bg-background-50 px-3 py-2 text-sm" />
                    </label>
                  </div>
                ) : (
                  <p className="flex-1 text-sm text-foreground-500">Fechado neste dia.</p>
                )}

                <div className="shrink-0">
                  <Button variant="primary" icon="ri-save-line" onClick={() => saveRow(row)} disabled={savingId === row.id}>
                    {savingId === row.id ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}