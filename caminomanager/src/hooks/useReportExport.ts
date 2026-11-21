'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { readAuthorizedReport } from '@/lib/reportAccess';

export function useReportExport<T>(loadRows: () => Promise<T[]>, download: (rows: T[]) => void) {
  const [pending, setPending] = useState<{ loadRows: typeof loadRows } | null>(null);
  const view = useRef(0);
  useLayoutEffect(() => () => { view.current++; }, [loadRows]);

  async function handleExport() {
    const startedIn = view.current;
    const request = { loadRows };
    setPending(request);
    try {
      const rows = await readAuthorizedReport(loadRows);
      if (view.current === startedIn) download(rows);
    } catch {
      if (view.current === startedIn) toast.error('No se pudo verificar el acceso o actualizar los datos del reporte.');
    } finally {
      setPending(current => current === request ? null : current);
    }
  }

  return { handleExport, isExporting: pending?.loadRows === loadRows };
}
