import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { ROLE_LABELS, type Role } from '../types';
import { ErrorBox, Field, errorMessage } from '../components/ui';

const ROLE_HELP: Record<Role, string> = {
  agent: 'Clients, listings, buyers and sellers',
  investor: 'Motivated sellers, deals and offers',
  remodeler: 'Remodel projects and estimates',
};

export function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<Role[]>(['investor']);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleRole(role: Role) {
    setRoles((current) => (current.includes(role) ? current.filter((r) => r !== role) : [...current, role]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === 'signup' && roles.length === 0) {
      setError('Choose at least one: Agent, Investor or Remodeler.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const needsConfirm = await signUp(email, password, fullName, roles);
        if (needsConfirm) {
          setNotice('Check your email and click the confirmation link, then sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-blue-700">DealFlow</h1>
          <p className="mt-1 text-sm text-slate-500">One place for agents, investors and remodelers.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {(['signup', 'signin'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md py-2 text-sm font-medium ${mode === m ? 'bg-white shadow-sm' : 'text-slate-600'}`}
              >
                {m === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          {!isSupabaseConfigured && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Demo mode: any email and password works. Data stays in this browser.
            </p>
          )}
          <ErrorBox message={error} />
          {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

          {mode === 'signup' && (
            <Field label="Your name">
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Field>
          )}
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input
              className="input"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {mode === 'signup' && (
            <fieldset>
              <legend className="label">I am a… (choose one or more)</legend>
              <div className="space-y-2">
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <label
                    key={role}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                      roles.includes(role) ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={roles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{ROLE_LABELS[role]}</span>
                      <span className="block text-xs text-slate-500">{ROLE_HELP[role]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
