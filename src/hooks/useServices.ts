import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Service } from '@/types/barber';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (err) throw err;
      setServices((data as Service[]) || []);
    } catch (e) {
      setError('Não foi possível carregar os serviços.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { services, loading, error, reload: load };
}