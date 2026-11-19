import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { BookingProduct } from '@/types/barber';

/** Loads the active upsell products shown in the booking EXTRAS step. */
export function useProducts() {
  const [products, setProducts] = useState<BookingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('booking_products')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (err) throw err;
      setProducts((data as BookingProduct[]) || []);
    } catch {
      setError('Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading, error, reload: load };
}