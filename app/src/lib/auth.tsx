import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Role } from '../types';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  /** Returns true if the user must confirm their email before signing in. */
  signUp(email: string, password: string, fullName: string, roles: Role[]): Promise<boolean>;
  signOut(): Promise<void>;
  updateRoles(roles: Role[]): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const DEMO_USER_KEY = 'dealflow-demo:user';

const VALID_ROLES: Role[] = ['agent', 'investor', 'remodeler'];
function cleanRoles(value: unknown): Role[] {
  const roles = Array.isArray(value) ? value.filter((r): r is Role => VALID_ROLES.includes(r)) : [];
  return roles.length ? roles : ['investor'];
}

async function loadSupabaseUser(): Promise<AppUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  // Roles live in the profiles table; fall back to sign-up metadata.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, roles')
    .eq('id', u.id)
    .maybeSingle();
  return {
    id: u.id,
    email: u.email ?? '',
    fullName: profile?.full_name ?? (u.user_metadata?.full_name as string) ?? '',
    roles: cleanRoles(profile?.roles ?? u.user_metadata?.roles),
  };
}

function readDemoUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function writeDemoUser(user: AppUser | null): void {
  try {
    if (user) localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(DEMO_USER_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setUser(readDemoUser());
      setLoading(false);
      return;
    }
    loadSupabaseUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
      else loadSupabaseUser().then(setUser);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    user,
    loading,

    async signIn(email, password) {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setUser(await loadSupabaseUser());
        return;
      }
      const existing = readDemoUser();
      const demo: AppUser = existing && existing.email === email
        ? existing
        : { id: 'demo-user', email, fullName: email.split('@')[0], roles: ['investor'] };
      writeDemoUser(demo);
      setUser(demo);
    },

    async signUp(email, password, fullName, roles) {
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, roles } },
        });
        if (error) throw error;
        if (!data.session) return true; // email confirmation required
        setUser(await loadSupabaseUser());
        return false;
      }
      const demo: AppUser = { id: 'demo-user', email, fullName, roles: cleanRoles(roles) };
      writeDemoUser(demo);
      setUser(demo);
      return false;
    },

    async signOut() {
      if (supabase) await supabase.auth.signOut();
      else writeDemoUser(null);
      setUser(null);
    },

    async updateRoles(roles) {
      if (!user) return;
      const next = cleanRoles(roles);
      if (supabase) {
        const { error } = await supabase.from('profiles').update({ roles: next }).eq('id', user.id);
        if (error) throw error;
      }
      const updated = { ...user, roles: next };
      if (!supabase) writeDemoUser(updated);
      setUser(updated);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
