import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/hooks/useSettings';
import type { Settings } from '@/types/barber';
import { Button, ErrorBlock, Field, LoadingBlock, Notice, SectionHeading, TextArea, TextInput } from '../ui';

const TIMEZONES = [
  'America/Campo_Grande',
  'America/Cuiaba',
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Recife',
];

export default function SettingsTab() {
  const { settings, loading, error, reload } = useSettings();
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    setForm(settings ? { ...settings } : null);
  }, [settings]);

  const update = (patch: Partial<Settings>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSave = async () => {
    if (!form) return;
    setNotice(null);
    setSaving(true);
    const { error: err } = await supabase
      .from('settings')
      .update({
        business_name: form.business_name,
        owner_name: form.owner_name,
        about: form.about,
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        instagram: form.instagram,
        address: form.address,
        maps_url: form.maps_url,
        timezone: form.timezone,
        booking_enabled: form.booking_enabled,
        buffer_minutes: Number(form.buffer_minutes) || 0,
        min_advance_minutes: Number(form.min_advance_minutes) || 0,
        late_tolerance_minutes: Number(form.late_tolerance_minutes) || 0,
      })
      .eq('id', 1);
    setSaving(false);
    if (err) return setNotice({ kind: 'error', message: 'Não foi possível salvar as configurações.' });
    setNotice({ kind: 'success', message: 'Configurações salvas.' });
    reload();
  };

  if (loading) return <LoadingBlock label="Carregando configurações..." />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;
  if (!form) return <ErrorBlock message="Configurações não encontradas." onRetry={reload} />;

  return (
    <div>
      <SectionHeading title="Configurações" subtitle="Dados comerciais e regras de agendamento." />

      {notice && <Notice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}

      <div className="space-y-6 max-w-3xl">
        <section className="rounded-lg border border-background-200 bg-background-50 p-5">
          <h3 className="font-heading text-base text-foreground-950 mb-4">Dados comerciais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome comercial">
              <TextInput value={form.business_name || ''} onChange={(e) => update({ business_name: e.target.value })} />
            </Field>
            <Field label="Responsável">
              <TextInput value={form.owner_name || ''} onChange={(e) => update({ owner_name: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <TextInput value={form.phone || ''} onChange={(e) => update({ phone: e.target.value })} />
            </Field>
            <Field label="WhatsApp">
              <TextInput value={form.whatsapp || ''} onChange={(e) => update({ whatsapp: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <TextInput value={form.email || ''} onChange={(e) => update({ email: e.target.value })} />
            </Field>
            <Field label="Instagram">
              <TextInput value={form.instagram || ''} onChange={(e) => update({ instagram: e.target.value })} />
            </Field>
            <Field label="Endereço">
              <TextInput value={form.address || ''} onChange={(e) => update({ address: e.target.value })} />
            </Field>
            <Field label="Link do Google Maps">
              <TextInput value={form.maps_url || ''} onChange={(e) => update({ maps_url: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Sobre">
              <TextArea rows={3} maxLength={500} value={form.about || ''} onChange={(e) => update({ about: e.target.value })} />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-background-200 bg-background-50 p-5">
          <h3 className="font-heading text-base text-foreground-950 mb-4">Agendamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fuso horário">
              <select
                value={form.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
                className="w-full rounded-md border border-background-300 bg-background-50 px-3 py-2.5 text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>
            <Field label="Antecedência mínima (min)">
              <TextInput inputMode="numeric" value={String(form.min_advance_minutes)} onChange={(e) => update({ min_advance_minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </Field>
            <Field label="Buffer entre atendimentos (min)">
              <TextInput inputMode="numeric" value={String(form.buffer_minutes)} onChange={(e) => update({ buffer_minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </Field>
            <Field label="Tolerância de atraso (min)">
              <TextInput inputMode="numeric" value={String(form.late_tolerance_minutes)} onChange={(e) => update({ late_tolerance_minutes: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </Field>
          </div>

          <label className={`mt-5 flex items-start gap-3 cursor-pointer rounded-md border px-4 py-3 ${form.booking_enabled ? 'border-primary-300 bg-primary-50' : 'border-background-300 bg-background-100'}`}>
            <input type="checkbox" checked={form.booking_enabled} onChange={(e) => update({ booking_enabled: e.target.checked })} className="w-4 h-4 accent-primary-500 mt-0.5" />
            <span>
              <span className="block text-sm font-medium text-foreground-900">Habilitar reservas públicas</span>
              <span className="block text-xs text-foreground-600 mt-0.5">
                Quando desligado, os clientes podem ver a agenda, mas não conseguem confirmar agendamentos.
              </span>
            </span>
          </label>
        </section>

        <div className="flex justify-end">
          <Button variant="primary" icon="ri-save-line" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </Button>
        </div>
      </div>
    </div>
  );
}