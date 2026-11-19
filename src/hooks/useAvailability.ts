import { useCallback, useEffect, useState } from 'react';
import { fetchAvailability, type AvailabilityResult } from '@/lib/booking';

interface AvailabilityState {
  loading: boolean;
  error: string | null;
  closed: boolean;
  reason: string | null;
  slots: string[];
}

const INITIAL: AvailabilityState = {
  loading: false,
  error: null,
  closed: false,
  reason: null,
  slots: [],
};

export function useAvailability(serviceId: string | null, date: string | null, addonMinutes = 0) {
  const [state, setState] = useState<AvailabilityState>(INITIAL);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;

    if (!serviceId || !date) {
      setState(INITIAL);
      return () => {
        active = false;
      };
    }

    setState({ ...INITIAL, loading: true });

    (async () => {
      try {
        const result = await fetchAvailability(serviceId, date, addonMinutes);
        if (!active) return;
        if (!result.ok) {
          setState({ ...INITIAL, error: result.message });
          return;
        }
        const data: AvailabilityResult = result.data;
        setState({
          loading: false,
          error: null,
          closed: Boolean(data.closed),
          reason: data.reason ?? null,
          slots: data.slots || [],
        });
      } catch {
        if (!active) return;
        setState({ ...INITIAL, error: 'Não foi possível consultar os horários.' });
      }
    })();

    return () => {
      active = false;
    };
  }, [serviceId, date, addonMinutes, reloadKey]);

  return { ...state, reload };
}