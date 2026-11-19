import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LOGO_URL } from '@/lib/site';
import { Button, Field, Notice, TextInput } from './ui';

interface AdminLoginProps {
  onSignIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
}

export default function AdminLogin({ onSignIn }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }
    setSubmitting(true);
    const result = await onSignIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) setError(result.message || 'Não foi possível entrar.');
  };

  return (
    <div className="min-h-screen w-full bg-accent-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <span className="w-16 h-16 rounded-full overflow-hidden ring-1 ring-primary-400/50 flex items-center justify-center">
            <img src={LOGO_URL} alt="Barbearia Daniel Nunes" title="Barbearia Daniel Nunes" className="w-full h-full object-cover" />
          </span>
          <h1 className="mt-4 font-heading text-2xl text-primary-300">Painel administrativo</h1>
          <p className="mt-1 text-sm text-background-300">Barbearia Daniel Nunes</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-primary-400/20 bg-background-50 p-6">
          <h2 className="font-heading text-lg text-foreground-950">Entrar</h2>
          <p className="mt-1 text-sm text-foreground-600">Acesso restrito ao proprietário.</p>

          {error && (
            <div className="mt-4">
              <Notice kind="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          <div className="mt-5 space-y-4">
            <Field label="E-mail">
              <TextInput
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </Field>
            <Field label="Senha">
              <TextInput
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
          </div>

          <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-6">
            {submitting ? (
              <>
                <i className="ri-loader-4-line animate-spin" /> Entrando...
              </>
            ) : (
              <>
                <i className="ri-login-circle-line" /> Entrar
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-background-300 hover:text-primary-300 transition-colors inline-flex items-center gap-2">
            <i className="ri-arrow-left-line" /> Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}