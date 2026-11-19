import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LOGO_URL } from '@/lib/site';

export type AdminTabKey =
  | 'appointments'
  | 'cash'
  | 'dashboard'
  | 'history'
  | 'services'
  | 'availability'
  | 'blocks'
  | 'settings'
  | 'password';

export const ADMIN_TABS: { key: AdminTabKey; label: string; icon: string }[] = [
  { key: 'appointments', label: 'Agendamentos', icon: 'ri-calendar-check-line' },
  { key: 'cash', label: 'Caixa', icon: 'ri-wallet-3-line' },
  { key: 'dashboard', label: 'Indicadores', icon: 'ri-bar-chart-box-line' },
  { key: 'history', label: 'Histórico', icon: 'ri-history-line' },
  { key: 'services', label: 'Serviços', icon: 'ri-scissors-2-line' },
  { key: 'availability', label: 'Disponibilidade', icon: 'ri-time-line' },
  { key: 'blocks', label: 'Bloqueios', icon: 'ri-forbid-line' },
  { key: 'settings', label: 'Configurações', icon: 'ri-settings-3-line' },
  { key: 'password', label: 'Minha senha', icon: 'ri-lock-password-line' },
];

interface AdminLayoutProps {
  active: AdminTabKey;
  onChange: (tab: AdminTabKey) => void;
  onLogout: () => void;
  userName: string;
  children: ReactNode;
}

export default function AdminLayout({ active, onChange, onLogout, userName, children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background-100 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-foreground-950 w-full">
        <div className="w-full px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-primary-400/50 flex items-center justify-center shrink-0">
              <img src={LOGO_URL} alt="Barbearia Daniel Nunes" title="Barbearia Daniel Nunes" className="w-full h-full object-cover" />
            </span>
            <div className="leading-tight min-w-0">
              <p className="font-heading text-sm md:text-base text-primary-300 truncate">Painel · Daniel Nunes</p>
              <p className="text-[10px] md:text-xs tracking-widest uppercase text-background-300 truncate">{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:inline-flex whitespace-nowrap items-center gap-2 rounded-md border border-primary-400/30 text-background-100 hover:text-primary-300 text-sm px-3 py-2 transition-colors"
            >
              <i className="ri-external-link-line" /> Ver site
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="whitespace-nowrap inline-flex items-center gap-2 rounded-md bg-primary-500 hover:bg-primary-600 text-foreground-950 text-sm font-semibold px-3 py-2 transition-colors"
            >
              <i className="ri-logout-box-r-line" /> <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Mobile tab strip */}
        <nav className="lg:hidden border-t border-primary-400/10 bg-foreground-950">
          <div className="flex gap-2 overflow-x-auto px-4 py-2.5">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                className={`whitespace-nowrap inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active === tab.key
                    ? 'bg-primary-500 text-foreground-950 font-semibold'
                    : 'text-background-200 hover:text-primary-300'
                }`}
              >
                <i className={tab.icon} />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <div className="flex-1 w-full flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-background-200 bg-background-50">
          <nav className="flex flex-col gap-1 p-3 sticky top-16">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                className={`whitespace-nowrap inline-flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm text-left transition-colors ${
                  active === tab.key
                    ? 'bg-primary-500 text-foreground-950 font-semibold'
                    : 'text-foreground-700 hover:bg-background-100 hover:text-foreground-950'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center"><i className={tab.icon} /></span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 w-full px-4 md:px-6 py-6 md:py-8">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}