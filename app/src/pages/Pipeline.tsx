import { useState, type FormEvent } from 'react';
import { db } from '../lib/db';
import { useTable } from '../lib/useTable';
import { emptyToNull, money, propertyLabel, toNumber } from '../lib/format';
import { MOTIVATION_TYPES, PIPELINE_STATUSES, type Lead, type PipelineStatus, type Property } from '../types';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorBox, Field, PageHeader, StatusBadge, errorMessage } from '../components/ui';

export function Pipeline() {
  const properties = useTable('properties');
  const leads = useTable('leads_marketing');
  const [editing, setEditing] = useState<Lead | 'new' | null>(null);
  const [hideClosed, setHideClosed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const propertyById = new Map(properties.rows.map((p) => [p.id, p]));
  const columns = PIPELINE_STATUSES.filter((s) => !hideClosed || (s !== 'Closed' && s !== 'Dead'));

  async function move(lead: Lead, status: PipelineStatus) {
    try {
      await db.update('leads_marketing', lead.id, { pipeline_status: status });
      await leads.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="Move each lead forward as the deal progresses."
        action={
          <button className="btn-primary" onClick={() => setEditing('new')} disabled={properties.rows.length === 0}>
            + Add lead
          </button>
        }
      />
      <ErrorBox message={error || leads.error || properties.error} />

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />
        Hide Closed and Dead
      </label>

      {!leads.loading && properties.rows.length === 0 ? (
        <EmptyState>Add a property first, then you can track it as a lead here.</EmptyState>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          <div className="flex gap-3">
            {columns.map((status) => {
              const items = leads.rows.filter((l) => l.pipeline_status === status);
              const total = items.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
              return (
                <section key={status} className="w-64 shrink-0 rounded-xl bg-slate-100 p-2">
                  <header className="mb-2 flex items-center justify-between px-1">
                    <StatusBadge status={status} />
                    <span className="text-xs text-slate-500">
                      {items.length} · {money(total)}
                    </span>
                  </header>
                  <div className="space-y-2">
                    {items.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        property={propertyById.get(lead.property_id)}
                        onEdit={() => setEditing(lead)}
                        onMove={(s) => move(lead, s)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <LeadForm
          lead={editing === 'new' ? null : editing}
          properties={properties.rows}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await leads.reload();
          }}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, property, onEdit, onMove }: {
  lead: Lead; property: Property | undefined; onEdit(): void; onMove(s: PipelineStatus): void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <button onClick={onEdit} className="block w-full text-left">
        <p className="font-medium text-slate-900">{property?.address ?? 'Unknown property'}</p>
        <p className="text-xs text-slate-500">{property ? `${property.city}, ${property.state}` : ''}</p>
        {lead.motivation_type && (
          <span className="mt-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{lead.motivation_type}</span>
        )}
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          <span className="text-slate-500">Value</span>
          <span className="text-right text-slate-800">{money(lead.estimated_value)}</span>
          <span className="text-slate-500">Max offer</span>
          <span className="text-right text-slate-800">{money(lead.max_allowable_offer)}</span>
        </div>
      </button>
      <select
        aria-label="Move to stage"
        className="input mt-2 py-1 text-xs"
        value={lead.pipeline_status}
        onChange={(e) => onMove(e.target.value as PipelineStatus)}
      >
        {PIPELINE_STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
    </div>
  );
}

function LeadForm({ lead, properties, onClose, onSaved }: {
  lead: Lead | null; properties: Property[]; onClose(): void; onSaved(): void;
}) {
  const [propertyId, setPropertyId] = useState(lead?.property_id ?? properties[0]?.id ?? '');
  const [motivation, setMotivation] = useState(lead?.motivation_type ?? '');
  const [status, setStatus] = useState<PipelineStatus>(lead?.pipeline_status ?? 'New Lead');
  const [value, setValue] = useState(lead?.estimated_value?.toString() ?? '');
  const [mao, setMao] = useState(lead?.max_allowable_offer?.toString() ?? '');
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      property_id: propertyId,
      motivation_type: emptyToNull(motivation),
      pipeline_status: status,
      estimated_value: toNumber(value),
      max_allowable_offer: toNumber(mao),
      notes: emptyToNull(notes),
    };
    try {
      if (lead) await db.update('leads_marketing', lead.id, row);
      else await db.insert('leads_marketing', row);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!lead || !confirm('Delete this lead? The property stays.')) return;
    try {
      await db.remove('leads_marketing', lead.id);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Modal title={lead ? 'Edit lead' : 'Add lead'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorBox message={error} />
        <Field label="Property *">
          <select className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
            {properties.map((p) => <option key={p.id} value={p.id}>{propertyLabel(p)}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Motivation / type">
            <select className="input" value={motivation} onChange={(e) => setMotivation(e.target.value)}>
              <option value="">—</option>
              {MOTIVATION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as PipelineStatus)}>
              {PIPELINE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Estimated value ($)">
            <input className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <Field label="Max allowable offer ($)">
            <input className="input" inputMode="decimal" value={mao} onChange={(e) => setMao(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex items-center justify-between gap-2 pt-2">
          {lead ? <button type="button" className="text-sm text-red-600 hover:underline" onClick={remove}>Delete lead</button> : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
