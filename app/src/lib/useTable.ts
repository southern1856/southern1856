import { useCallback, useEffect, useState } from 'react';
import { db } from './db';
import type { TableName, TableRows } from '../types';

/** Loads a table and exposes a reload function. */
export function useTable<T extends TableName>(table: T) {
  const [rows, setRows] = useState<TableRows[T][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setRows(await db.list(table));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, error, reload };
}
