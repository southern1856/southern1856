import { useState, type FormEvent } from 'react';
import { db } from '../lib/db';
import { useTable } from '../lib/useTable';
import { emptyToNull, propertyLabel, shortDate } from '../lib/format';
import { CONTACT_TYPES, type Contact, type Property } from '../types';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorBox, Field, PageHeader, errorMessage } from '../components/ui';

export function Contacts() {
  const contacts = useTable('contacts');
  const properties = useTable('properties');
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);

  const propertyById = new Map(properties.rows.map((p) => [p.id, p]));
  const q = search.toLowerCase();
  const shown = contacts.rows.filter(
    (c) =>
      (!type || c.contact_type === type) &&
      [c.first_name, c.last_name, c.email, c.phone_1, c.phone_2].some((v) => (v ?? '').toLowerCase().includes(q)),
  );

  async function markContacted(c: Contact) {
    try {
      await db.update('contacts', c.id, { last_contacted: new Date().toISOString() });
      await contacts.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="Owners, buyers, sellers, clients and partners."
        action={<button className="btn-primary" onClick={() => setEditing('new')}>+ Add contact</button>}
      />
      <ErrorBox message={error || contacts.error} />

      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Search name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {contacts.loading ? null : shown.length === 0 ? (
        <EmptyState>{contacts.rows.length ? 'No contacts match.' : 'No contacts yet. Click "Add contact" to start.'}</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'No name';
            return (
              <div key={c.id} className="card flex flex-col text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{name}</p>
                  {c.contact_type && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{c.contact_type}</span>}
                </div>
                {c.phone_1 && <a href={`tel:${c.phone_1}`} className="mt-1 text-blue-600">{c.phone_1}</a>}
                {c.phone_2 && <a href={`tel:${c.phone_2}`} className="text-blue-600">{c.phone_2}</a>}
                {c.email && <a href={`mailto:${c.email}`} className="truncate text-blue-600">{c.email}</a>}
                {c.property_id && <p className="mt-1 text-xs text-slate-500">🏠 {propertyLabel(propertyById.get(c.property_id))}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  Last contacted: {shortDate(c.last_contacted)}
                  {c.is_skip_traced && ' · Skip traced'}
                </p>
                <div className="mt-auto flex gap-2 pt-3">
                  <button className="btn-secondary flex-1 py-1" onClick={() => markContacted(c)}>Contacted today</button>
                  <button className="btn-secondary py-1" onClick={() => setEditing(c)}>Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ContactForm
          contact={editing === 'new' ? null : editing}
          properties={properties.rows}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await contacts.reload();
          }}
        />
      )}
    </div>
  );
}

function ContactForm({ contact, properties, onClose, onSaved }: {
  contact: Contact | null; properties: Property[]; onClose(): void; onSaved(): void;
}) {
  const [f, setF] = useState({
    contact_type: contact?.contact_type ?? 'Owner',
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    phone_1: contact?.phone_1 ?? '',
    phone_2: contact?.phone_2 ?? '',
    email: contact?.email ?? '',
    mailing_address: contact?.mailing_address ?? '',
    property_id: contact?.property_id ?? '',
    notes: contact?.notes ?? '',
  });
  const [skipTraced, setSkipTraced] = useState(contact?.is_skip_traced ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.first_name.trim() && !f.last_name.trim()) {
      setError('Enter a first or last name.');
      return;
    }
    setBusy(true);
    setError(null);
    const row = {
      contact_type: emptyToNull(f.contact_type),
      first_name: emptyToNull(f.first_name),
      last_name: emptyToNull(f.last_name),
      phone_1: emptyToNull(f.phone_1),
      phone_2: emptyToNull(f.phone_2),
      email: emptyToNull(f.email),
      mailing_address: emptyToNull(f.mailing_address),
      property_id: emptyToNull(f.property_id),
      notes: emptyToNull(f.notes),
      is_skip_traced: skipTraced,
      last_contacted: contact?.last_contacted ?? null,
    };
    try {
      if (contact) await db.update('contacts', contact.id, row);
      else await db.insert('contacts', row);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!contact || !confirm('Delete this contact?')) return;
    try {
      await db.remove('contacts', contact.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title={contact ? 'Edit contact' : 'Add contact'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorBox message={error} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><input className="input" value={f.first_name} onChange={set('first_name')} /></Field>
          <Field label="Last name"><input className="input" value={f.last_name} onChange={set('last_name')} /></Field>
          <Field label="Type">
            <select className="input" value={f.contact_type} onChange={set('contact_type')}>
              {CONTACT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="Phone"><input className="input" type="tel" value={f.phone_1} onChange={set('phone_1')} /></Field>
          <Field label="Phone 2"><input className="input" type="tel" value={f.phone_2} onChange={set('phone_2')} /></Field>
        </div>
        <Field label="Mailing address"><input className="input" value={f.mailing_address} onChange={set('mailing_address')} /></Field>
        <Field label="Related property">
          <select className="input" value={f.property_id} onChange={set('property_id')}>
            <option value="">None</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{propertyLabel(p)}</option>)}
          </select>
        </Field>
        <Field label="Notes"><textarea className="input" rows={2} value={f.notes} onChange={set('notes')} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={skipTraced} onChange={(e) => setSkipTraced(e.target.checked)} />
          Skip traced
        </label>
        <div className="flex items-center justify-between gap-2 pt-2">
          {contact ? <button type="button" className="text-sm text-red-600 hover:underline" onClick={remove}>Delete contact</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
