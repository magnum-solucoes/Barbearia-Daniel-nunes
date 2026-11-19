import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BusinessHour } from '@/types/barber';

export function useBusinessHours() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('business_hours')
        .select('*')
        .order('weekday', { ascending: true });
      if (err) throw err;
      setHours((data as BusinessHour[]) || []);
    } catch (e) {
      setError('Não foi possível carregar os horários de atendimento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { hours, loading, error, reload: load };
}