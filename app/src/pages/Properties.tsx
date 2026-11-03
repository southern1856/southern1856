import { useState, type FormEvent } from 'react';
import { db } from '../lib/db';
import { useTable } from '../lib/useTable';
import { emptyToNull, toNumber, money } from '../lib/format';
import { LEAD_SOURCES, MOTIVATION_TYPES, PIPELINE_STATUSES, PROPERTY_TYPES, type PipelineStatus, type Property } from '../types';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorBox, Field, PageHeader, StatusBadge, errorMessage } from '../components/ui';

type Form = Record<
  'address' | 'city' | 'state' | 'zip_code' | 'county' | 'property_type' | 'bedrooms' | 'bathrooms' |
  'year_built' | 'square_footage' | 'lead_source',
  string
>;

const EMPTY: Form = {
  address: '', city: '', state: '', zip_code: '', county: '', property_type: '', bedrooms: '',
  bathrooms: '', year_built: '', square_footage: '', lead_source: '',
};

function toForm(p: Property): Form {
  const s = (v: string | number | null) => (v === null ? '' : String(v));
  return {
    address: p.address, city: p.city, state: p.state, zip_code: p.zip_code, county: s(p.county),
    property_type: s(p.property_type), bedrooms: s(p.bedrooms), bathrooms: s(p.bathrooms),
    year_built: s(p.year_built), square_footage: s(p.square_footage), lead_source: s(p.lead_source),
  };
}

export function Properties() {
  const properties = useTable('properties');
  const leads = useTable('leads_marketing');
  const [editing, setEditing] = useState<Property | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const q = search.toLowerCase();
  const shown = properties.rows.filter((p) =>
    [p.address, p.city, p.state, p.zip_code, p.county ?? ''].some((v) => v.toLowerCase().includes(q)),
  );

  async function remove(p: Property) {
    if (!confirm(`Delete ${p.address}? Its leads will be deleted too.`)) return;
    try {
      await db.remove('properties', p.id);
      await Promise.all([properties.reload(), leads.reload()]);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Every house, building or lot you're working on."
        action={<button className="btn-primary" onClick={() => setEditing('new')}>+ Add property</button>}
      />
      <ErrorBox message={error || properties.error} />

      <input
        className="input mb-4 max-w-sm"
        placeholder="Search address, city, ZIP…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {properties.loading ? null : shown.length === 0 ? (
        <EmptyState>{properties.rows.length ? 'No properties match your search.' : 'No properties yet. Click "Add property" to start.'}</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const propertyLeads = leads.rows.filter((l) => l.property_id === p.id);
            return (
              <div key={p.id} className="card flex flex-col">
                <p className="font-semibold text-slate-900">{p.address}</p>
                <p className="text-sm text-slate-500">
                  {p.city}, {p.state} {p.zip_code}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {[p.property_type, p.bedrooms !== null && `${p.bedrooms} bd`, p.bathrooms !== null && `${p.bathrooms} ba`,
                    p.square_footage !== null && `${p.square_footage.toLocaleString()} sqft`, p.year_built && `built ${p.year_built}`]
                    .filter(Boolean)
                    .join(' · ') || 'No details yet'}
                </p>
                {p.lead_source && <p className="mt-1 text-xs text-slate-500">Source: {p.lead_source}</p>}
                <div className="mt-3 flex flex-wrap gap-1">
                  {propertyLeads.map((l) => (
                    <span key={l.id} className="flex items-center gap-1 text-xs">
                      <StatusBadge status={l.pipeline_status} />
                      {l.estimated_value !== null && <span className="text-slate-500">{money(l.estimated_value)}</span>}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex gap-2 pt-4">
                  <button className="btn-secondary flex-1 py-1" onClick={() => setEditing(p)}>Edit</button>
                  <button className="btn-secondary py-1 text-red-600" onClick={() => remove(p)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <PropertyForm
          property={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await Promise.all([properties.reload(), leads.reload()]);
          }}
        />
      )}
    </div>
  );
}

function PropertyForm({ property, onClose, onSaved }: { property: Property | null; onClose(): void; onSaved(): void }) {
  const [form, setForm] = useState<Form>(property ? toForm(property) : EMPTY);
  const [addLead, setAddLead] = useState(!property);
  const [motivation, setMotivation] = useState('');
  const [status, setStatus] = useState<PipelineStatus>('New Lead');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip_code: form.zip_code.trim(),
      county: emptyToNull(form.county),
      property_type: emptyToNull(form.property_type),
      bedrooms: toNumber(form.bedrooms),
      bathrooms: toNumber(form.bathrooms),
      year_built: toNumber(form.year_built),
      square_footage: toNumber(form.square_footage),
      lead_source: emptyToNull(form.lead_source),
    };
    try {
      if (property) {
        await db.update('properties', property.id, row);
      } else {
        const created = await db.insert('properties', row);
        if (addLead) {
          await db.insert('leads_marketing', {
            property_id: created.id,
            motivation_type: emptyToNull(motivation),
            pipeline_status: status,
            estimated_value: toNumber(value),
            max_allowable_offer: null,
            notes: null,
          });
        }
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={property ? 'Edit property' : 'Add property'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorBox message={error} />
        <Field label="Street address *">
          <input className="input" value={form.address} onChange={set('address')} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City *"><input className="input" value={form.city} onChange={set('city')} required /></Field>
          <Field label="State *"><input className="input" value={form.state} onChange={set('state')} required /></Field>
          <Field label="ZIP *"><input className="input" value={form.zip_code} onChange={set('zip_code')} required /></Field>
          <Field label="County"><input className="input" value={form.county} onChange={set('county')} /></Field>
          <Field label="Type">
            <select className="input" value={form.property_type} onChange={set('property_type')}>
              <option value="">—</option>
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Lead source">
            <select className="input" value={form.lead_source} onChange={set('lead_source')}>
              <option value="">—</option>
              {LEAD_SOURCES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Bedrooms"><input className="input" inputMode="numeric" value={form.bedrooms} onChange={set('bedrooms')} /></Field>
          <Field label="Bathrooms"><input className="input" inputMode="decimal" value={form.bathrooms} onChange={set('bathrooms')} /></Field>
          <Field label="Square feet"><input className="input" inputMode="numeric" value={form.square_footage} onChange={set('square_footage')} /></Field>
          <Field label="Year built"><input className="input" inputMode="numeric" value={form.year_built} onChange={set('year_built')} /></Field>
        </div>

        {!property && (
          <div className="rounded-lg border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={addLead} onChange={(e) => setAddLead(e.target.checked)} />
              Also add it to my pipeline as a lead
            </label>
            {addLead && (
              <div className="mt-3 grid grid-cols-2 gap-3">
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
                <Field label="Estimated value ($)" className="col-span-2">
                  <input className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
                </Field>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
