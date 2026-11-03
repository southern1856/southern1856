import { supabase } from './supabase';
import type { TableName, TableRows } from '../types';

type NewRow<T extends TableName> = Omit<TableRows[T], 'id' | 'created_at' | 'updated_at'>;
type Patch<T extends TableName> = Partial<NewRow<T>>;

/**
 * One data API used by every page.
 * - With Supabase configured, it reads/writes the real database.
 * - Without it (demo mode), it stores data in this browser's localStorage.
 */
export const db = {
  async list<T extends TableName>(table: T): Promise<TableRows[T][]> {
    if (supabase) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TableRows[T][];
    }
    return demoRead(table);
  },

  async insert<T extends TableName>(table: T, row: NewRow<T>): Promise<TableRows[T]> {
    if (supabase) {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      return data as TableRows[T];
    }
    const now = new Date().toISOString();
    const created = {
      ...row,
      id: crypto.randomUUID(),
      created_at: now,
      ...(table === 'leads_marketing' ? { updated_at: now } : {}),
    } as unknown as TableRows[T];
    demoWrite(table, [created, ...demoRead(table)]);
    return created;
  },

  async update<T extends TableName>(table: T, id: string, patch: Patch<T>): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from(table).update(patch).eq('id', id);
      if (error) throw error;
      return;
    }
    const extra = table === 'leads_marketing' ? { updated_at: new Date().toISOString() } : {};
    demoWrite(
      table,
      demoRead(table).map((r) => (r.id === id ? { ...r, ...patch, ...extra } : r)),
    );
  },

  async remove<T extends TableName>(table: T, id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return;
    }
    demoWrite(
      table,
      demoRead(table).filter((r) => r.id !== id),
    );
    // Mirror the database's ON DELETE rules for properties.
    if (table === 'properties') {
      demoWrite('leads_marketing', demoRead('leads_marketing').filter((l) => l.property_id !== id));
      demoWrite(
        'contacts',
        demoRead('contacts').map((c) => (c.property_id === id ? { ...c, property_id: null } : c)),
      );
      demoWrite(
        'tasks',
        demoRead('tasks').map((t) => (t.property_id === id ? { ...t, property_id: null } : t)),
      );
    }
    if (table === 'contacts') {
      demoWrite(
        'tasks',
        demoRead('tasks').map((t) => (t.contact_id === id ? { ...t, contact_id: null } : t)),
      );
    }
  },
};

// ---------- demo-mode storage (browser only) ----------
const DEMO_PREFIX = 'dealflow-demo:';

function demoRead<T extends TableName>(table: T): TableRows[T][] {
  try {
    const raw = localStorage.getItem(DEMO_PREFIX + table);
    return raw ? (JSON.parse(raw) as TableRows[T][]) : [];
  } catch {
    return [];
  }
}

function demoWrite<T extends TableName>(table: T, rows: TableRows[T][]): void {
  try {
    localStorage.setItem(DEMO_PREFIX + table, JSON.stringify(rows));
  } catch {
    // Storage unavailable (private mode, etc.) — data won't persist.
  }
}

export function clearDemoData(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(DEMO_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
