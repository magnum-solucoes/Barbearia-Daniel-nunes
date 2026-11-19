import { useMemo, useState } from 'react';
import { instantFull } from '@/lib/booking';
import { formatPhoneBR, whatsappHref } from '@/lib/format';
import { useAdminAppointments } from '@/hooks/useAdminData';
import type { Appointment } from '@/types/barber';
import { EmptyBlock, ErrorBlock, LoadingBlock, SectionHeading, Select, StatusBadge, TextInput } from '../ui';
import AppointmentHistoryModal from '../appointments/AppointmentHistoryModal';

interface HistoryTabProps {
  timeZone: string;
}

export default function HistoryTab({ timeZone }: HistoryTabProps) {
  const { appointments, loading, error, reload } = useAdminAppointments();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [historyId, setHistoryId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments
      .filter((a) => (statusFilter === 'all' ? true : a.status === statusFilter))
      .filter((a) => {
        if (!q) return true;
        const digits = q.replace(/\D/g, '');
        const nameMatch = a.client_name.toLowerCase().includes(q);
        const phoneMatch = digits.length > 0 && a.client_phone.includes(digits);
        return nameMatch || phoneMatch;
      })
      .sort((a, b) => (a.start_at < b.start_at ? 1 : -1));
  }, [appointments, query, statusFilter]);

  return (
    <div>
      <SectionHeading title="Histórico" subtitle="Pesquise clientes e consulte as alterações de cada atendimento." />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone"
          />
        </div>
        <div className="sm:w-52">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Não veio</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Carregando histórico..." />
      ) : error ? (
        <ErrorBlock message={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyBlock message="Nenhum atendimento encontrado." icon="ri-history-line" />
      ) : (
        <div className="rounded-lg border border-background-200 bg-background-50 overflow-hidden">
          <div className="divide-y divide-background-200">
            {filtered.map((a: Appointment) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground-900">{a.client_name}</p>
                  <p className="text-xs text-foreground-500 flex flex-wrap gap-x-3 mt-0.5">
                    <span className="capitalize">{instantFull(a.start_at, timeZone)}</span>
                    <span>{a.service_name_snapshot}</span>
                    <span>{formatPhoneBR(a.client_phone)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <StatusBadge status={a.status} />
                  {(() => {
                    const href = whatsappHref(
                      a.client_phone,
                      `Olá, ${a.client_name}! Aqui é da Barbearia Daniel Nunes.`,
                    );
                    if (!href) return null;
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Falar no WhatsApp"
                        aria-label={`Falar no WhatsApp com ${a.client_name}`}
                        className="w-9 h-9 flex items-center justify-center rounded-md border border-primary-300 hover:bg-primary-50 text-primary-800 transition-colors"
                      >
                        <i className="ri-whatsapp-line" />
                      </a>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => setHistoryId(a.id)}
                    className="whitespace-nowrap inline-flex items-center gap-2 rounded-md border border-background-300 hover:border-primary-400 text-foreground-800 text-sm px-3 py-2 transition-colors"
                  >
                    <i className="ri-history-line" /> Histórico
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AppointmentHistoryModal
        open={Boolean(historyId)}
        onClose={() => setHistoryId(null)}
        appointmentId={historyId}
        timeZone={timeZone}
      />
    </div>
  );
}