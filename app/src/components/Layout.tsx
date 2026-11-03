import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { ROLE_LABELS } from '../types';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/pipeline', label: 'Pipeline', icon: '📊' },
  { to: '/properties', label: 'Properties', icon: '🏘️' },
  { to: '/contacts', label: 'Contacts', icon: '👥' },
  { to: '/tasks', label: 'Tasks', icon: '✅' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
            }`
          }
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  const userBox = user && (
    <div className="border-t border-slate-200 pt-4">
      <p className="truncate text-sm font-medium text-slate-900">{user.fullName || user.email}</p>
      <p className="mb-3 text-xs text-slate-500">{user.roles.map((r) => ROLE_LABELS[r]).join(' · ')}</p>
      <button onClick={signOut} className="btn-secondary w-full">
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="text-lg font-bold text-blue-700">DealFlow</span>
        <button onClick={() => setOpen((o) => !o)} className="btn-secondary px-3 py-1" aria-label="Menu">
          {open ? '✕' : '☰'}
        </button>
      </header>
      {open && (
        <div className="border-b border-slate-200 bg-white p-4 md:hidden">
          {nav}
          <div className="mt-4">{userBox}</div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 md:flex md:h-screen md:sticky md:top-0">
        <div>
          <div className="mb-6 px-3 text-xl font-bold text-blue-700">DealFlow</div>
          {nav}
        </div>
        {userBox}
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        {!isSupabaseConfigured && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Demo mode:</strong> data is saved only in this browser. Connect Supabase to save it online.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
