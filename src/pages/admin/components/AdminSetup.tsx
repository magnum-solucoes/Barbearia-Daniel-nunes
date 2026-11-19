import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { LOGO_URL } from '@/lib/site';
import { runBootstrap } from '@/lib/admin';
import { Button, Field, Notice, TextInput } from './ui';

const OWNER_EMAIL = 'barbeariadanielnunes@gmail.com';

interface AdminSetupProps {
  onDone: () => void;
}

export default function AdminSetup({ onDone }: AdminSetupProps) {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError('Informe o token de configuração.');
      return;
    }
    if (!email.trim()) {
      setError('Informe o e-mail do proprietário.');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter ao menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    const result = await runBootstrap({ token: token.trim(), email: email.trim().toLowerCase(), password });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(true);
  };

  return (
    <div className="min-h-screen w-full bg-accent-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <span className="w-16 h-16 rounded-full overflow-hidden ring-1 ring-primary-400/50 flex items-center justify-center">
            <img src={LOGO_URL} alt="Barbearia Daniel Nunes" title="Barbearia Daniel Nunes" className="w-full h-full object-cover" />
          </span>
          <h1 className="mt-4 font-heading text-2xl text-primary-300">Configuração inicial</h1>
          <p className="mt-1 text-sm text-background-300">Barbearia Daniel Nunes</p>
        </div>

        {success ? (
          <div className="rounded-lg border border-primary-400/20 bg-background-50 p-6 text-center">
            <span className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-100 text-primary-800 text-2xl">
              <i className="ri-checkbox-circle-line" />
            </span>
            <h2 className="mt-4 font-heading text-lg text-foreground-950">Administrador criado!</h2>
            <p className="mt-2 text-sm text-foreground-600">
              A configuração inicial foi concluída e bloqueada permanentemente. Agora entre com o e-mail e a senha que você definiu.
            </p>
            <Button variant="primary" icon="ri-login-circle-line" className="w-full mt-6" onClick={onDone}>
              Entrar agora
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-lg border border-primary-400/20 bg-background-50 p-6">
            <h2 className="font-heading text-lg text-foreground-950">Primeiro acesso</h2>
            <p className="mt-1 text-sm text-foreground-600">
              Ainda não existe administrador. Crie o primeiro acesso do proprietário.
            </p>

            <div className="mt-4">
              <Notice
                kind="error"
                message="Esta tela aparece apenas uma vez. Após criar o administrador, ela é bloqueada permanentemente."
              />
            </div>

            {error && (
              <div className="mt-4">
                <Notice kind="error" message={error} onClose={() => setError(null)} />
              </div>
            )}

            <div className="mt-5 space-y-4">
              <Field label="Token de configuração" hint="Fornecido com segurança junto ao projeto.">
                <TextInput
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                  placeholder="••••••••••••"
                />
              </Field>
              <Field label="E-mail do proprietário">
                <TextInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="seu@email.com"
                />
              </Field>
              <Field label="Senha" hint="Mínimo de 8 caracteres.">
                <TextInput
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </Field>
              <Field label="Confirmar senha">
                <TextInput
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </Field>
            </div>

            <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-6">
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin" /> Configurando...
                </>
              ) : (
                <>
                  <i className="ri-shield-keyhole-line" /> Criar administrador
                </>
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-background-300 hover:text-primary-300 transition-colors inline-flex items-center gap-2">
            <i className="ri-arrow-left-line" /> Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}