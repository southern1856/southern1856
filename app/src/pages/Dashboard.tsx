import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTable } from '../lib/useTable';
import { money, shortDate, todayISO, propertyLabel } from '../lib/format';
import { PIPELINE_STATUSES, type Role } from '../types';
import { ErrorBox, PageHeader, StatusBadge } from '../components/ui';

const COMING_NEXT: Record<Role, { title: string; items: string[] }> = {
  investor: {
    title: 'Coming for investors',
    items: ['Deal calculator (ARV, repairs, max offer, profit)', 'Driving-for-dollars mode', 'Cash buyers list'],
  },
  agent: {
    title: 'Coming for agents',
    items: ['Listings (Active / Pending / Sold)', 'Buyer matching', 'Open-house sign-in and commissions'],
  },
  remodeler: {
    title: 'Coming for remodelers',
    items: ['Remodel estimator with price lists', 'Send estimates to investors', 'Job tracking'],
  },
};

export function Dashboard() {
  const { user } = useAuth();
  const properties = useTable('properties');
  const leads = useTable('leads_marketing');
  const contacts = useTable('contacts');
  const tasks = useTable('tasks');

  const today = todayISO();
  const openTasks = tasks.rows.filter((t) => !t.is_done);
  const dueTasks = openTasks
    .filter((t) => t.due_date && t.due_date <= today)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
  const activeLeads = leads.rows.filter((l) => l.pipeline_status !== 'Closed' && l.pipeline_status !== 'Dead');
  const pipelineValue = activeLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
  const propertyById = new Map(properties.rows.map((p) => [p.id, p]));
  const recentLeads = [...leads.rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  const stats = [
    { label: 'Active leads', value: String(activeLeads.length), to: '/pipeline' },
    { label: 'Pipeline value', value: money(pipelineValue), to: '/pipeline' },
    { label: 'Properties', value: String(properties.rows.length), to: '/properties' },
    { label: 'Contacts', value: String(contacts.rows.length), to: '/contacts' },
  ];

  return (
    <div>
      <PageHeader title={`Welcome${user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!`} subtitle="Here's your business today." />
      <ErrorBox message={properties.error || leads.error || contacts.error || tasks.error} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card hover:border-blue-300">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Due today or overdue</h2>
            <Link to="/tasks" className="text-sm text-blue-600 hover:underline">All tasks</Link>
          </div>
          {dueTasks.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing due. Nice work! 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {dueTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-800">{t.title}</span>
                  <span className={t.due_date! < today ? 'text-red-600' : 'text-slate-500'}>{shortDate(t.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Pipeline</h2>
            <Link to="/pipeline" className="text-sm text-blue-600 hover:underline">Open pipeline</Link>
          </div>
          <div className="space-y-2">
            {PIPELINE_STATUSES.map((status) => {
              const count = leads.rows.filter((l) => l.pipeline_status === status).length;
              const pct = leads.rows.length ? (count / leads.rows.length) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-slate-600">{status}</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right font-medium text-slate-800">{count}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900">Recently updated leads</h2>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-slate-500">
              No leads yet. <Link to="/properties" className="text-blue-600 hover:underline">Add your first property</Link> to get started.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentLeads.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-slate-800">{propertyLabel(propertyById.get(l.property_id))}</span>
                  <StatusBadge status={l.pipeline_status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {user?.roles.map((role) => (
          <section key={role} className="card border-dashed bg-slate-50">
            <h2 className="mb-2 font-semibold text-slate-900">{COMING_NEXT[role].title}</h2>
            <ul className="list-inside list-disc text-sm text-slate-600">
              {COMING_NEXT[role].items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
