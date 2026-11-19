import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Settings } from '@/types/barber';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (err) throw err;
      setSettings((data as Settings) || null);
    } catch (e) {
      setError('Não foi possível carregar as informações da barbearia.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, loading, error, reload: load };
}