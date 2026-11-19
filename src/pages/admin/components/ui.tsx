import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

/* ---------------- Status ----------------- */

export const STATUS_META: Record<string, { label: string; className: string; icon: string }> = {
  pending: { label: 'Pendente', className: 'bg-secondary-100 text-secondary-900 border-secondary-200', icon: 'ri-time-line' },
  confirmed: { label: 'Confirmado', className: 'bg-primary-100 text-primary-800 border-primary-200', icon: 'ri-checkbox-circle-line' },
  completed: { label: 'Concluído', className: 'bg-accent-100 text-accent-800 border-accent-200', icon: 'ri-check-double-line' },
  cancelled: { label: 'Cancelado', className: 'bg-background-200 text-foreground-600 border-background-300', icon: 'ri-close-circle-line' },
  no_show: { label: 'Não veio', className: 'bg-accent-50 text-accent-700 border-accent-200', icon: 'ri-user-unfollow-line' },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${meta.className}`}>
      <i className={meta.icon} />
      {meta.label}
    </span>
  );
}

/* ---------------- Cards / layout ----------------- */

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-background-200 bg-background-50 ${className}`}>{children}</div>;
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
      <div>
        <h2 className="font-heading text-xl md:text-2xl text-foreground-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-foreground-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string;
  icon: string;
  tone?: 'neutral' | 'primary' | 'accent' | 'secondary';
  hint?: string;
}) {
  const toneMap: Record<string, string> = {
    neutral: 'bg-background-100 text-foreground-700',
    primary: 'bg-primary-100 text-primary-800',
    accent: 'bg-accent-100 text-accent-800',
    secondary: 'bg-secondary-100 text-secondary-900',
  };
  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-foreground-500">{label}</p>
          <p className="mt-2 font-heading text-2xl text-foreground-950">{value}</p>
          {hint && <p className="mt-1 text-xs text-foreground-500">{hint}</p>}
        </div>
        <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${toneMap[tone]}`}>
          <i className={icon} />
        </span>
      </div>
    </Panel>
  );
}

/* ---------------- Buttons ----------------- */

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  icon,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'dark';
  type?: 'button' | 'submit';
  disabled?: boolean;
  icon?: string;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-foreground-950',
    dark: 'bg-foreground-950 hover:bg-foreground-800 text-background-50',
    ghost: 'border border-background-300 bg-background-50 hover:border-primary-400 text-foreground-900',
    danger: 'border border-accent-300 bg-accent-50 hover:bg-accent-100 text-accent-800',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {icon && <i className={icon} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  title,
  onClick,
  tone = 'neutral',
  disabled,
}: {
  icon: string;
  title: string;
  onClick?: () => void;
  tone?: 'neutral' | 'primary' | 'accent';
  disabled?: boolean;
}) {
  const toneMap: Record<string, string> = {
    neutral: 'border-background-300 hover:border-foreground-400 text-foreground-700',
    primary: 'border-primary-300 hover:bg-primary-50 text-primary-800',
    accent: 'border-accent-300 hover:bg-accent-50 text-accent-800',
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 flex items-center justify-center rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneMap[tone]}`}
    >
      <i className={icon} />
    </button>
  );
}

/* ---------------- Form fields ----------------- */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-foreground-600 mb-1.5">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-foreground-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-background-300 bg-background-50 px-3 py-2.5 text-sm text-foreground-950 placeholder:text-foreground-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} resize-none ${props.className || ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className || ''}`} />;
}

/* ---------------- Feedback ----------------- */

export function Notice({ kind, message, onClose }: { kind: 'error' | 'success'; message: string; onClose?: () => void }) {
  const styles =
    kind === 'error'
      ? 'border-accent-200 bg-accent-50 text-accent-800'
      : 'border-primary-200 bg-primary-50 text-primary-800';
  const icon = kind === 'error' ? 'ri-error-warning-line' : 'ri-checkbox-circle-line';
  return (
    <div className={`flex items-start gap-3 rounded-md border px-4 py-3 mb-4 ${styles}`}>
      <span className="w-5 h-5 flex items-center justify-center mt-0.5"><i className={icon} /></span>
      <p className="text-sm flex-1">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fechar" className="w-5 h-5 flex items-center justify-center">
          <i className="ri-close-line" />
        </button>
      )}
    </div>
  );
}

export function LoadingBlock({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-foreground-600">
      <i className="ri-loader-4-line text-2xl animate-spin" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-accent-200 bg-accent-50 p-6 text-center">
      <span className="w-10 h-10 mx-auto flex items-center justify-center text-2xl text-accent-700"><i className="ri-error-warning-line" /></span>
      <p className="mt-2 text-sm text-accent-800">{message}</p>
      {onRetry && (
        <Button variant="dark" icon="ri-refresh-line" className="mt-4" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function EmptyBlock({ message, icon = 'ri-inbox-line' }: { message: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-foreground-500">
      <span className="w-12 h-12 flex items-center justify-center rounded-full bg-background-100 text-2xl"><i className={icon} /></span>
      <p className="mt-3 text-sm">{message}</p>
    </div>
  );
}

/* ---------------- Modal ----------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-foreground-950/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full md:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-lg md:rounded-lg border border-background-200 bg-background-50">
        <div className="flex items-center justify-between gap-4 border-b border-background-200 px-5 py-4">
          <h3 className="font-heading text-lg text-foreground-950">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-600">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="border-t border-background-200 px-5 py-4 flex flex-col sm:flex-row justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}