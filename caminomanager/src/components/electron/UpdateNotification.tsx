'use client';

import { useState, useEffect } from 'react';

export function UpdateNotification() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    const removeListener = window.electronAPI.onUpdateDownloaded(() => {
      setUpdateReady(true);
    });

    return removeListener;
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-lg">
      <span className="text-sm font-medium">
        Actualización disponible
      </span>
      <button
        onClick={() => window.electronAPI?.installUpdate()}
        className="rounded bg-background px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-muted"
      >
        Reiniciar
      </button>
    </div>
  );
}
