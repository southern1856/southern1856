import { useState, type FormEvent } from 'react';
import { db } from '../lib/db';
import { useTable } from '../lib/useTable';
import { emptyToNull, propertyLabel, shortDate, todayISO } from '../lib/format';
import type { Task } from '../types';
import { EmptyState, ErrorBox, PageHeader, errorMessage } from '../components/ui';

export function Tasks() {
  const tasks = useTable('tasks');
  const properties = useTable('properties');
  const contacts = useTable('contacts');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(todayISO());
  const [propertyId, setPropertyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const propertyById = new Map(properties.rows.map((p) => [p.id, p]));
  const contactById = new Map(contacts.rows.map((c) => [c.id, c]));
  const sorted = [...tasks.rows].sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
  const open = sorted.filter((t) => !t.is_done);
  const done = sorted.filter((t) => t.is_done);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await db.insert('tasks', {
        title: title.trim(),
        due_date: emptyToNull(due),
        is_done: false,
        property_id: emptyToNull(propertyId),
        contact_id: emptyToNull(contactId),
      });
      setTitle('');
      await tasks.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function toggle(t: Task) {
    try {
      await db.update('tasks', t.id, { is_done: !t.is_done });
      await tasks.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove(t: Task) {
    try {
      await db.remove('tasks', t.id);
      await tasks.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function row(t: Task) {
    const contact = t.contact_id ? contactById.get(t.contact_id) : undefined;
    const related = [
      t.property_id && propertyLabel(propertyById.get(t.property_id)),
      contact && [contact.first_name, contact.last_name].filter(Boolean).join(' '),
    ].filter(Boolean).join(' · ');
    const overdue = !t.is_done && t.due_date !== null && t.due_date < today;
    return (
      <li key={t.id} className="flex items-start gap-3 py-3">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={t.is_done} onChange={() => toggle(t)} aria-label="Done" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${t.is_done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{t.title}</p>
          {related && <p className="truncate text-xs text-slate-500">{related}</p>}
        </div>
        <span className={`shrink-0 text-xs ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
          {overdue && 'Overdue · '}{shortDate(t.due_date)}
        </span>
        <button onClick={() => remove(t)} className="shrink-0 text-xs text-slate-400 hover:text-red-600" aria-label="Delete task">✕</button>
      </li>
    );
  }

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Follow-ups and reminders so no lead falls through the cracks." />
      <ErrorBox message={error || tasks.error} />

      <form onSubmit={add} className="card mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input className="input" placeholder="e.g. Call the owner of 12 Oak St back" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input sm:w-40" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
        <select className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} aria-label="Related property">
          <option value="">No property</option>
          {properties.rows.map((p) => <option key={p.id} value={p.id}>{propertyLabel(p)}</option>)}
        </select>
        <select className="input sm:w-40" value={contactId} onChange={(e) => setContactId(e.target.value)} aria-label="Related contact">
          <option value="">No contact</option>
          {contacts.rows.map((c) => (
            <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'No name'}</option>
          ))}
        </select>
        <button className="btn-primary sm:col-span-2">+ Add task</button>
      </form>

      {tasks.loading ? null : open.length === 0 ? (
        <EmptyState>No open tasks. 🎉</EmptyState>
      ) : (
        <ul className="card divide-y divide-slate-100 py-0">{open.map(row)}</ul>
      )}

      {done.length > 0 && (
        <div className="mt-4">
          <button className="text-sm text-blue-600 hover:underline" onClick={() => setShowDone((s) => !s)}>
            {showDone ? 'Hide' : 'Show'} completed ({done.length})
          </button>
          {showDone && <ul className="card mt-2 divide-y divide-slate-100 py-0">{done.map(row)}</ul>}
        </div>
      )}
    </div>
  );
}
