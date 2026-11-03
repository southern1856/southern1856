import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="card py-10 text-center text-sm text-slate-500">{children}</div>;
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

const STATUS_COLORS: Record<string, string> = {
  'New Lead': 'bg-slate-100 text-slate-700',
  Contacted: 'bg-sky-100 text-sky-700',
  Warm: 'bg-amber-100 text-amber-800',
  Appointment: 'bg-violet-100 text-violet-700',
  'Offer Made': 'bg-orange-100 text-orange-800',
  'Under Contract': 'bg-blue-100 text-blue-700',
  Closed: 'bg-emerald-100 text-emerald-700',
  Dead: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-slate-100'}`}>
      {status}
    </span>
  );
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
