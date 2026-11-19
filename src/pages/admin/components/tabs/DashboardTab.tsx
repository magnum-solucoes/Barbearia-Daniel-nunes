import { useMemo } from 'react';
import { formatBRL } from '@/lib/format';
import { useAdminAppointments, useAdminCash } from '@/hooks/useAdminData';
import { ErrorBlock, LoadingBlock, SectionHeading, StatCard } from '../ui';

export default function DashboardTab() {
  const { appointments, loading: loadingA, error: errorA, reload: reloadA } = useAdminAppointments();
  const { entries, loading: loadingC, error: errorC, reload: reloadC } = useAdminCash();

  const stats = useMemo(() => {
    const active = appointments.filter((a) => a.status !== 'cancelled');
    const total = active.length;
    const pending = appointments.filter((a) => a.status === 'pending').length;
    const confirmed = appointments.filter((a) => a.status === 'confirmed').length;
    const completed = appointments.filter((a) => a.status === 'completed').length;
    const noShow = appointments.filter((a) => a.status === 'no_show').length;
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length;

    const forecast = appointments
      .filter((a) => a.status !== 'cancelled')
      .reduce((sum, a) => sum + (Number(a.service_price_snapshot) || 0), 0);

    const received = entries
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const expenses = entries
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return { total, pending, confirmed, completed, noShow, cancelled, forecast, received, expenses, balance: received - expenses };
  }, [appointments, entries]);

  const loading = loadingA || loadingC;
  const error = errorA || errorC;

  return (
    <div>
      <SectionHeading title="Indicadores" subtitle="Visão geral dos agendamentos e do caixa." />

      {loading ? (
        <LoadingBlock label="Calculando indicadores..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => { reloadA(); reloadC(); }} />
      ) : (
        <>
          <h3 className="font-heading text-base text-foreground-800 mb-3">Agendamentos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            <StatCard label="Total" value={String(stats.total)} icon="ri-calendar-event-line" tone="secondary" />
            <StatCard label="Pendentes" value={String(stats.pending)} icon="ri-time-line" tone="secondary" />
            <StatCard label="Confirmados" value={String(stats.confirmed)} icon="ri-checkbox-circle-line" tone="primary" />
            <StatCard label="Concluídos" value={String(stats.completed)} icon="ri-check-double-line" tone="accent" />
            <StatCard label="Ausências" value={String(stats.noShow)} icon="ri-user-unfollow-line" tone="accent" />
          </div>

          <h3 className="font-heading text-base text-foreground-800 mb-3">Financeiro</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label="Faturamento previsto" value={formatBRL(stats.forecast)} icon="ri-line-chart-line" tone="secondary" hint="Soma dos atendimentos não cancelados" />
            <StatCard label="Recebido (caixa)" value={formatBRL(stats.received)} icon="ri-money-dollar-circle-line" tone="primary" hint="Entradas efetivamente registradas" />
            <StatCard label="Saldo do caixa" value={formatBRL(stats.balance)} icon="ri-wallet-3-line" tone="accent" hint={`Despesas: ${formatBRL(stats.expenses)}`} />
          </div>

          {stats.cancelled > 0 && (
            <p className="mt-4 text-sm text-foreground-500">Cancelados: {stats.cancelled}</p>
          )}
        </>
      )}
    </div>
  );
}