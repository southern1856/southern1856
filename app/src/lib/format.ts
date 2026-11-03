export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  // Date-only strings (YYYY-MM-DD) are treated as local dates, not UTC.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Turns a form text value into a number or null. */
export function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function emptyToNull(value: string): string | null {
  return value.trim() === '' ? null : value.trim();
}

export function propertyLabel(p: { address: string; city: string; state: string } | undefined): string {
  return p ? `${p.address}, ${p.city}, ${p.state}` : 'Unknown property';
}
