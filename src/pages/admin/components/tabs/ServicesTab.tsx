import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatBRL, WEEKDAYS_SHORT } from '@/lib/format';
import { promoWeekdaysLabel } from '@/lib/booking';
import { useAdminServices } from '@/hooks/useAdminData';
import type { Service } from '@/types/barber';
import { Button, EmptyBlock, ErrorBlock, Field, LoadingBlock, Modal, Notice, SectionHeading, TextArea, TextInput } from '../ui';
import ProductsSection from '@/pages/admin/components/services/ProductsSection';

const EMPTY: Omit<Service, 'id'> = {
  name: '',
  description: '',
  price: 0,
  duration_minutes: 30,
  active: true,
  sort_order: 0,
  image_url: null,
  promo_enabled: false,
  promo_price: null,
  promo_weekdays: [],
  promo_only: false,
};

export default function ServicesTab() {
  const { services, loading, error, reload } = useAdminServices();
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<Service, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    const nextOrder = services.length > 0 ? Math.max(...services.map((s) => s.sort_order)) + 1 : 1;
    setForm({ ...EMPTY, sort_order: nextOrder });
    setFormOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description || '',
      price: s.price,
      duration_minutes: s.duration_minutes,
      active: s.active,
      sort_order: s.sort_order,
      image_url: s.image_url,
      promo_enabled: Boolean(s.promo_enabled),
      promo_price: s.promo_price,
      promo_weekdays: s.promo_weekdays || [],
      promo_only: Boolean(s.promo_only),
    });
    setFormOpen(true);
  };

  const togglePromoWeekday = (weekday: number) => {
    setForm((prev) => {
      const current = prev.promo_weekdays || [];
      const next = current.includes(weekday)
        ? current.filter((w) => w !== weekday)
        : [...current, weekday].sort((a, b) => a - b);
      return { ...prev, promo_weekdays: next };
    });
  };

  const handleSave = async () => {
    if (form.name.trim().length < 2) return setNotice({ kind: 'error', message: 'Informe o nome do serviço.' });
    if (!(Number(form.duration_minutes) > 0)) return setNotice({ kind: 'error', message: 'Duração deve ser maior que zero.' });
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      price: Number(form.price) || 0,
      duration_minutes: Number(form.duration_minutes) || 0,
      active: form.active,
      sort_order: Number(form.sort_order) || 0,
      image_url: form.image_url?.trim() || null,
      promo_enabled: Boolean(form.promo_enabled),
      promo_price: form.promo_enabled && form.promo_price != null ? Number(form.promo_price) : null,
      promo_weekdays:
        form.promo_enabled && form.promo_weekdays && form.promo_weekdays.length > 0
          ? form.promo_weekdays
          : null,
      promo_only: form.promo_enabled ? Boolean(form.promo_only) : false,
    };
    const { error: err } = editing
      ? await supabase.from('services').update(payload).eq('id', editing.id)
      : await supabase.from('services').insert(payload);
    setSaving(false);
    if (err) {
      setNotice({ kind: 'error', message: 'Não foi possível salvar o serviço.' });
      return;
    }
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(false);
    setNotice({ kind: 'success', message: 'Serviço salvo.' });
    reload();
  };

  const toggleActive = async (s: Service) => {
    setBusyId(s.id);
    const { error: err } = await supabase.from('services').update({ active: !s.active }).eq('id', s.id);
    setBusyId(null);
    if (err) return setNotice({ kind: 'error', message: 'Não foi possível alterar a visibilidade.' });
    reload();
  };

  const move = async (s: Service, dir: -1 | 1) => {
    const sorted = services.slice().sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === s.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    setBusyId(s.id);
    await supabase.from('services').update({ sort_order: other.sort_order }).eq('id', s.id);
    await supabase.from('services').update({ sort_order: s.sort_order }).eq('id', other.id);
    setBusyId(null);
    reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const { error: err } = await supabase.from('services').delete().eq('id', deleteTarget.id);
    setSaving(false);
    if (err) {
      setDeleteTarget(null);
      return setNotice({ kind: 'error', message: 'Não foi possível excluir. Considere apenas ocultá-lo.' });
    }
    setDeleteTarget(null);
    setNotice({ kind: 'success', message: 'Serviço excluído.' });
    reload();
  };

  const modalOpen = formOpen;

  return (
    <div>
      <SectionHeading
        title="Serviços"
        subtitle="Cadastro, preços, duração e visibilidade. Alterar o preço não afeta agendamentos antigos."
        action={<Button variant="primary" icon="ri-add-line" onClick={openCreate}>Novo serviço</Button>}
      />

      {notice && <Notice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}

      {loading ? (
        <LoadingBlock label="Carregando serviços..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : services.length === 0 ? (
        <EmptyBlock message="Nenhum serviço cadastrado." icon="ri-scissors-2-line" />
      ) : (
        <div className="space-y-3">
          {services.map((s, idx) => (
            <div key={s.id} className="rounded-lg border border-background-200 bg-background-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <span className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-background-100 flex items-center justify-center text-foreground-400">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} title={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <i className="ri-scissors-2-line text-xl" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading text-base text-foreground-950">{s.name}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${s.active ? 'bg-primary-100 text-primary-800 border-primary-200' : 'bg-background-200 text-foreground-600 border-background-300'}`}>
                      {s.active ? 'Visível' : 'Oculto'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground-600 line-clamp-1">{s.description || 'Sem descrição.'}</p>
                  <p className="mt-1 text-sm text-foreground-800">
                    <strong>{formatBRL(s.price)}</strong> · {s.duration_minutes} min
                  </p>
                  {s.promo_enabled && s.promo_price != null && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-100 px-2.5 py-0.5 text-xs text-accent-800">
                      <i className="ri-price-tag-3-line" />
                      {s.promo_only ? 'Só na promoção' : 'Promoção'}: <strong>{formatBRL(s.promo_price)}</strong>
                      {s.promo_weekdays && s.promo_weekdays.length > 0 ? ` · ${promoWeekdaysLabel(s.promo_weekdays)}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button type="button" title="Subir" aria-label="Subir" disabled={idx === 0 || busyId === s.id} onClick={() => move(s, -1)} className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:border-primary-400 disabled:opacity-30">
                  <i className="ri-arrow-up-line" />
                </button>
                <button type="button" title="Descer" aria-label="Descer" disabled={idx === services.length - 1 || busyId === s.id} onClick={() => move(s, 1)} className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:border-primary-400 disabled:opacity-30">
                  <i className="ri-arrow-down-line" />
                </button>
                <button type="button" title="Ativar/Ocultar" aria-label="Ativar ou ocultar" disabled={busyId === s.id} onClick={() => toggleActive(s)} className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:border-primary-400">
                  <i className={s.active ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
                <Button variant="ghost" icon="ri-edit-line" onClick={() => openEdit(s)}>Editar</Button>
                <button type="button" title="Excluir" aria-label="Excluir" onClick={() => setDeleteTarget(s)} className="w-9 h-9 flex items-center justify-center rounded-md border border-accent-300 hover:bg-accent-50 text-accent-700">
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setEditing(null); setForm(EMPTY); setFormOpen(false); }}
        title={editing ? 'Editar serviço' : 'Novo serviço'}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setEditing(null); setForm(EMPTY); setFormOpen(false); }}>Cancelar</Button>
            <Button variant="primary" icon="ri-save-line" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome">
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Corte masculino" />
          </Field>
          <Field label="Descrição">
            <TextArea rows={3} maxLength={500} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Preço (R$)">
              <TextInput inputMode="decimal" value={String(form.price)} onChange={(e) => setForm({ ...form, price: Number(e.target.value.replace(',', '.')) || 0 })} />
            </Field>
            <Field label="Duração (minutos)">
              <TextInput inputMode="numeric" value={String(form.duration_minutes)} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </Field>
          </div>

          <div className="rounded-md border border-background-200 bg-background-100 p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.promo_enabled} onChange={(e) => setForm({ ...form, promo_enabled: e.target.checked })} className="w-4 h-4 accent-primary-500" />
              <span className="text-sm font-medium text-foreground-900">Preço promocional por dia da semana</span>
            </label>
            {form.promo_enabled && (
              <div className="mt-4 space-y-4">
                <Field label="Preço promocional (R$)">
                  <TextInput
                    inputMode="decimal"
                    value={form.promo_price == null ? '' : String(form.promo_price)}
                    onChange={(e) => setForm({ ...form, promo_price: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) || 0 })}
                    placeholder="Ex.: 55"
                  />
                </Field>
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wider text-foreground-600 mb-1.5">Dias da promoção</span>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS_SHORT.map((label, idx) => {
                      const active = (form.promo_weekdays || []).includes(idx);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => togglePromoWeekday(idx)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            active
                              ? 'bg-primary-500 border-primary-500 text-foreground-950 font-semibold'
                              : 'border-background-300 text-foreground-700 hover:border-primary-400'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.promo_only} onChange={(e) => setForm({ ...form, promo_only: e.target.checked })} className="w-4 h-4 accent-primary-500 mt-0.5" />
                  <span className="text-sm text-foreground-800">
                    Disponível <strong>apenas</strong> nos dias da promoção (fora deles o serviço não é oferecido na agenda).
                  </span>
                </label>
                <p className="text-xs text-foreground-500">
                  O valor promocional é aplicado automaticamente quando a data do atendimento cair em um dos dias marcados — sempre no fuso da barbearia. Reservas antigas mantêm o preço registrado.
                </p>
              </div>
            )}
          </div>
          <Field label="Imagem (URL, opcional)">
            <TextInput value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
          </Field>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 accent-primary-500" />
            <span className="text-sm text-foreground-800">Serviço visível na home e na agenda</span>
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir serviço"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" icon="ri-delete-bin-line" onClick={handleDelete} disabled={saving}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground-700">
          Excluir <strong>{deleteTarget?.name}</strong>? Agendamentos antigos mantêm o nome e o preço registrados.
          Se preferir, apenas oculte o serviço.
        </p>
      </Modal>

      <ProductsSection />
    </div>
  );
}