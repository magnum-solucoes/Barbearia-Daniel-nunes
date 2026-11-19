import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSettings } from '@/hooks/useSettings';
import { fetchSetupStatus } from '@/lib/admin';
import { DEFAULT_TZ } from '@/lib/booking';
import AdminLayout, { type AdminTabKey } from './components/AdminLayout';
import AdminLogin from './components/AdminLogin';
import AdminSetup from './components/AdminSetup';
import AppointmentsTab from './components/appointments/AppointmentsTab';
import CashTab from './components/tabs/CashTab';
import DashboardTab from './components/tabs/DashboardTab';
import HistoryTab from './components/tabs/HistoryTab';
import ServicesTab from './components/tabs/ServicesTab';
import AvailabilityTab from './components/tabs/AvailabilityTab';
import BlocksTab from './components/tabs/BlocksTab';
import SettingsTab from './components/tabs/SettingsTab';
import PasswordTab from './components/tabs/PasswordTab';

export default function Admin() {
  const { loading, user, isAdmin, signIn, signOut } = useAdminAuth();
  const { settings } = useSettings();
  const [tab, setTab] = useState<AdminTabKey>('appointments');
  const [setupState, setSetupState] = useState<'loading' | 'needed' | 'ready'>('loading');

  const timeZone = settings?.timezone || DEFAULT_TZ;

  useEffect(() => {
    let active = true;
    fetchSetupStatus().then((result) => {
      if (!active) return;
      // Only show the one-time setup when we positively confirmed there is no admin.
      setSetupState(result.ok && !result.configured ? 'needed' : 'ready');
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading || setupState === 'loading') {
    return (
      <div className="min-h-screen w-full bg-accent-950 flex flex-col items-center justify-center text-background-200">
        <i className="ri-loader-4-line text-3xl animate-spin" />
        <p className="mt-4 text-sm">Verificando acesso...</p>
      </div>
    );
  }

  if (setupState === 'needed') {
    return <AdminSetup onDone={() => setSetupState('ready')} />;
  }

  if (!user || !isAdmin) {
    return <AdminLogin onSignIn={signIn} />;
  }

  const renderTab = () => {
    switch (tab) {
      case 'appointments':
        return <AppointmentsTab timeZone={timeZone} />;
      case 'cash':
        return <CashTab timeZone={timeZone} />;
      case 'dashboard':
        return <DashboardTab />;
      case 'history':
        return <HistoryTab timeZone={timeZone} />;
      case 'services':
        return <ServicesTab />;
      case 'availability':
        return <AvailabilityTab />;
      case 'blocks':
        return <BlocksTab timeZone={timeZone} />;
      case 'settings':
        return <SettingsTab />;
      case 'password':
        return <PasswordTab email={user.email ?? null} />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout active={tab} onChange={setTab} onLogout={signOut} userName={user.email || 'Administrador'}>
      {renderTab()}
    </AdminLayout>
  );
}