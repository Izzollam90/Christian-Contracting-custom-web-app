import {
  createContext, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({ session: null, profile: null, loading: true, refreshProfile: async () => {} });

export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const s = (await supabase().auth.getSession()).data.session;
    setSession(s);
    if (s) {
      const { data } = await supabase().from('profiles').select('*').eq('id', s.user.id).single();
      setProfile((data as Profile) ?? null);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    void (async () => {
      await refreshProfile();
      setLoading(false);
    })();
    const { data: sub } = supabase().auth.onAuthStateChange(() => {
      void refreshProfile();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, profile, loading, refreshProfile }), [session, profile, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// Subscribe to realtime changes on a table with an optional filter, calling back with the payload.
export function useRealtime(table: string, filter: string | null, onChange: () => void) {
  useEffect(() => {
    const ch = supabase()
      .channel(`${table}-${filter ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, () => onChange())
      .subscribe();
    return () => {
      void supabase().removeChannel(ch);
    };
  }, [table, filter]);
}
