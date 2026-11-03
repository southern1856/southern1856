import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { clearDemoData } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import { ROLE_LABELS, type Role } from '../types';
import { ErrorBox, PageHeader, errorMessage } from '../components/ui';

export function Settings() {
  const { user, updateRoles } = useAuth();
  const [roles, setRoles] = useState<Role[]>(user?.roles ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    setError(null);
    if (roles.length === 0) {
      setError('Choose at least one role.');
      return;
    }
    try {
      await updateRoles(roles);
      setMessage('Saved.');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" />
      <section className="card mb-4 space-y-3">
        <h2 className="font-semibold text-slate-900">My roles</h2>
        <p className="text-sm text-slate-500">Your roles decide which tools you see.</p>
        <ErrorBox message={error} />
        {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
          <label key={role} className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={roles.includes(role)}
              onChange={() => setRoles((r) => (r.includes(role) ? r.filter((x) => x !== role) : [...r, role]))}
            />
            {ROLE_LABELS[role]}
          </label>
        ))}
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save}>Save roles</button>
          {message && <span className="text-sm text-emerald-700">{message}</span>}
        </div>
      </section>

      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold text-slate-900">Database</h2>
        {isSupabaseConfigured ? (
          <p className="text-slate-600">Connected to Supabase. Your data is saved online.</p>
        ) : (
          <>
            <p className="text-slate-600">Demo mode — data is saved only in this browser.</p>
            <button
              className="btn-secondary text-red-600"
              onClick={() => {
                if (confirm('Delete all demo data in this browser?')) {
                  clearDemoData();
                  window.location.reload();
                }
              }}
            >
              Clear demo data
            </button>
          </>
        )}
      </section>
    </div>
  );
}
