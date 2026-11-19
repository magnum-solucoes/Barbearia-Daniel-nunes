import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Field, Notice, SectionHeading, TextInput } from '../ui';

interface PasswordTabProps {
  email: string | null;
}

export default function PasswordTab({ email }: PasswordTabProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!email) return setNotice({ kind: 'error', message: 'Sessão sem e-mail associado.' });
    if (!current || !next) return setNotice({ kind: 'error', message: 'Preencha todos os campos.' });
    if (next.length < 8) return setNotice({ kind: 'error', message: 'A nova senha deve ter ao menos 8 caracteres.' });
    if (next !== confirm) return setNotice({ kind: 'error', message: 'A confirmação não confere com a nova senha.' });

    setSaving(true);
    // Reauthenticate by verifying the current password before changing it.
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (verifyError) {
      setSaving(false);
      return setNotice({ kind: 'error', message: 'Senha atual incorreta.' });
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setSaving(false);
    if (updateError) {
      return setNotice({ kind: 'error', message: 'Não foi possível alterar a senha. Tente novamente.' });
    }
    setCurrent('');
    setNext('');
    setConfirm('');
    setNotice({ kind: 'success', message: 'Senha alterada com sucesso.' });
  };

  return (
    <div>
      <SectionHeading title="Minha senha" subtitle="Altere a senha do administrador autenticado com segurança." />

      {notice && <Notice kind={notice.kind} message={notice.message} onClose={() => setNotice(null)} />}

      <form onSubmit={handleSubmit} className="max-w-md rounded-lg border border-background-200 bg-background-50 p-5 space-y-4">
        <Field label="Senha atual">
          <TextInput type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
          <TextInput type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirmar nova senha">
          <TextInput type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" icon="ri-lock-password-line" disabled={saving} className="w-full">
          {saving ? 'Salvando...' : 'Alterar senha'}
        </Button>
      </form>
    </div>
  );
}