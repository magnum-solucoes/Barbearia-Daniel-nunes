import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { checkIsAdmin } from '@/lib/admin';

export interface AdminAuthState {
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
  error: string | null;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    loading: true,
    user: null,
    isAdmin: false,
    error: null,
  });

  const resolveSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({ loading: false, user: null, isAdmin: false, error: null });
      return;
    }
    const isAdmin = await checkIsAdmin(session.user.id);
    setState({ loading: false, user: session.user, isAdmin, error: null });
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      resolveSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      // Keep the callback synchronous: only kick off async work without awaiting/returning it.
      resolveSession(session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [resolveSession]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, message: 'E-mail ou senha incorretos.' };
    }
    const user = data.user;
    if (!user) return { ok: false, message: 'Não foi possível iniciar a sessão.' };

    const isAdmin = await checkIsAdmin(user.id);
    if (!isAdmin) {
      await supabase.auth.signOut();
      return { ok: false, message: 'Esta conta não tem permissão de administrador.' };
    }
    setState({ loading: false, user, isAdmin: true, error: null });
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ loading: false, user: null, isAdmin: false, error: null });
  }, []);

  return { ...state, signIn, signOut };
}