import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatBRL } from '@/lib/format';
import { useAdminProducts } from '@/hooks/useAdminData';
import type { BookingProduct } from '@/types/barber';
import {
  Button,
  EmptyBlock,
  ErrorBlock,
  Field,
  LoadingBlock,
  Modal,
  Notice,
  Select,
  TextArea,
  TextInput,
} from '@/pages/admin/components/ui';

type ProductForm = Omit<BookingProduct, 'id' | 'created_at' | 'updated_at'>;

const EMPTY: ProductForm = {
  name: '',
  description: '',
  price: 0,
  max_quantity: 1,
  active: true,
  sort_order: 0,
  image_url: null,
  kind: 'product',
  duration_minutes: 0,
};

export default function ProductsSection() {
  const { products, loading, error, reload } = useAdminProducts();
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [editing, setEditing] = useState<BookingProduct | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookingProduct | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    const nextOrder = products.length > 0 ? Math.max(...products.map((p) => p.sort_order)) + 1 : 1;
    setForm({ ...EMPTY, sort_order: nextOrder });
    setFormOpen(true);
  };

  const openEdit = (p: BookingProduct) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || '',
      price: p.price,
      max_quantity: p.max_quantity,
      active: p.active,
      sort_order: p.sort_order,
      image_url: p.image_url,
      kind: p.kind || 'product',
      duration_minutes: Number(p.duration_minutes) || 0,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(false);
  };

  const handleSave = async () => {
    if (form.name.trim().length < 2) return setNotice({ kind: 'error', message: 'Informe o nome do produto.' });
    if (!(Number(form.price) >= 0)) return setNotice({ kind: 'error', message: 'Informe um preço válido.' });
    if (!(Number(form.max_quantity) >= 1)) return setNotice({ kind: 'error', message: 'A quantidade máxima deve ser ao menos 1.' });

    const isService = form.kind === 'service';
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      price: Number(form.price) || 0,
      max_quantity: Number(form.max_quantity) || 1,
      active: form.active,
      sort_order: Number(form.sort_order) || 0,
      image_url: form.image_url?.trim() || null,
      kind: isService ? 'service' : 'product',
      duration_minutes: isService ? Math.max(0, Number(form.duration_minutes) || 0) : 0,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = editing
      ? await supabase.from('booking_products').update(payload).eq('id', editing.id)
      : await supabase.from('booking_products').insert(payload);
    setSaving(false);
    if (err) {
      setNotice({ kind: 'error', message: 'Não foi possível salvar o produto.' });
      return;
    }
    closeForm();
    setNotice({ kind: 'success', message: 'Produto salvo.' });
    reload();
  };

  const toggleActive = async (p: BookingProduct) => {
    setBusyId(p.id);
    const { error: err } = await supabase.from('booking_products').update({ active: !p.active }).eq('id', p.id);
    setBusyId(null);
    if (err) return setNotice({ kind: 'error', message: 'Não foi possível alterar a visibilidade.' });
    reload();
  };

  const move = async (p: BookingProduct, dir: -1 | 1) => {
    const sorted = products.slice().sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === p.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    setBusyId(p.id);
    await supabase.from('booking_products').update({ sort_order: other.sort_order }).eq('id', p.id);
    await supabase.from('booking_products').update({ sort_order: p.sort_order }).eq('id', other.id);
    setBusyId(null);
    reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const { error: err } = await supabase.from('booking_products').delete().eq('id', deleteTarget.id);
    setSaving(false);
    if (err) {
      setDeleteTarget(null);
      return setNotice({ kind: 'error', message: 'Não foi possível excluir. Considere apenas desativá-lo.' });
    }
    setDeleteTarget(null);
    setNotice({ kind: 'success', message: 'Produto excluído.' });
    reload();
  };

  return (
    <section className="mt-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="font-heading text-xl md:text-2xl text-foreground-950">Produtos e adicionais</h2>
          <p className="mt-1 text-sm text-foreground-600">
            Ofertas exibidas na etapa de extras do agendamento. Os produtos são reservados para pagamento na
            barbearia — sem controle de estoque ou pagamento online.
          </p>
        </div>
        <Button variant="primary" icon="ri-add-line" onClick={openCreate}>
          Novo produto
        </Button>
      </div>

      {notice && <Notice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}

      {loading ? (
        <LoadingBlock label="Carregando produtos..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : products.length === 0 ? (
        <EmptyBlock message="Nenhum produto cadastrado." icon="ri-shopping-bag-3-line" />
      ) : (
        <div className="space-y-3">
          {products.map((p, idx) => (
            <div
              key={p.id}
              className="rounded-lg border border-background-200 bg-background-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <span className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-background-100 flex items-center justify-center text-foreground-400">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} title={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <i className="ri-shopping-bag-3-line text-xl" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading text-base text-foreground-950">{p.name}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${
                        p.kind === 'service'
                          ? 'bg-secondary-100 text-secondary-900 border-secondary-200'
                          : 'bg-background-200 text-foreground-700 border-background-300'
                      }`}
                    >
                      <i className={p.kind === 'service' ? 'ri-scissors-2-line' : 'ri-shopping-bag-3-line'} />
                      {p.kind === 'service' ? 'Serviço adicional' : 'Produto'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${
                        p.active
                          ? 'bg-primary-100 text-primary-800 border-primary-200'
                          : 'bg-background-200 text-foreground-600 border-background-300'
                      }`}
                    >
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground-600 line-clamp-1">{p.description || 'Sem descrição.'}</p>
                  <p className="mt-1 text-sm text-foreground-800">
                    <strong>{formatBRL(p.price)}</strong> · máx. {p.max_quantity} por agendamento
                    {p.kind === 'service' && (Number(p.duration_minutes) || 0) > 0
                      ? ` · +${p.duration_minutes} min`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  title="Subir"
                  aria-label="Subir"
                  disabled={idx === 0 || busyId === p.id}
                  onClick={() => move(p, -1)}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:border-primary-400 disabled:opacity-30"
                >
                  <i className="ri-arrow-up-line" />
                </button>
                <button
                  type="button"
                  title="Descer"
                  aria-label="Descer"
                  disabled={idx === products.length - 1 || busyId === p.id}
                  onClick={() => move(p, 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:border-primary-400 disabled:opacity-30"
                >
                  <i className="ri-arrow-down-line" />
                </button>
                <button
                  type="button"
                  title="Ativar/Desativar"
                  aria-label="Ativar ou desativar"
                  disabled={busyId === p.id}
                  onClick={() => toggleActive(p)}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 hover:border-primary-400"
                >
                  <i className={p.active ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
                <Button variant="ghost" icon="ri-edit-line" onClick={() => openEdit(p)}>
                  Editar
                </Button>
                <button
                  type="button"
                  title="Excluir"
                  aria-label="Excluir"
                  onClick={() => setDeleteTarget(p)}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-accent-300 hover:bg-accent-50 text-accent-700"
                >
                  <i className="ri-delete-bin-line" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar produto' : 'Novo produto'}
        footer={
          <>
            <Button variant="ghost" onClick={closeForm}>
              Cancelar
            </Button>
            <Button variant="primary" icon="ri-save-line" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Tipo de adicional">
            <Select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as 'product' | 'service' })}
            >
              <option value="product">Produto (não altera a duração)</option>
              <option value="service">Serviço adicional (acrescenta tempo)</option>
            </Select>
          </Field>
          <Field label="Nome">
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Pomada modeladora"
            />
          </Field>
          <Field label="Descrição curta">
            <TextArea
              rows={2}
              maxLength={300}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex.: Fixação e brilho para o dia a dia."
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Preço (R$)">
              <TextInput
                inputMode="decimal"
                value={String(form.price)}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value.replace(',', '.')) || 0 })}
              />
            </Field>
            <Field label="Qtd. máxima por agendamento">
              <TextInput
                inputMode="numeric"
                value={String(form.max_quantity)}
                onChange={(e) => setForm({ ...form, max_quantity: Number(e.target.value.replace(/\D/g, '')) || 1 })}
              />
            </Field>
          </div>
          {form.kind === 'service' && (
            <Field
              label="Duração adicional (min)"
              hint="Tempo somado ao atendimento quando este serviço é escolhido."
            >
              <TextInput
                inputMode="numeric"
                value={String(form.duration_minutes)}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              />
            </Field>
          )}
          <Field label="Imagem (URL)" hint="Use uma imagem quadrada para melhor resultado.">
            <TextInput
              value={form.image_url || ''}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
          </Field>
          {form.image_url ? (
            <div className="w-24 h-24 rounded-md overflow-hidden border border-background-200 bg-background-100">
              <img src={form.image_url} alt="Pré-visualização" className="w-full h-full object-cover" />
            </div>
          ) : null}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 accent-primary-500"
            />
            <span className="text-sm text-foreground-800">Adicional ativo na etapa de extras</span>
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir produto"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" icon="ri-delete-bin-line" onClick={handleDelete} disabled={saving}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground-700">
          Excluir <strong>{deleteTarget?.name}</strong>? Agendamentos antigos mantêm o nome e o preço registrados.
          Se preferir, apenas desative o adicional.
        </p>
      </Modal>
    </section>
  );
}