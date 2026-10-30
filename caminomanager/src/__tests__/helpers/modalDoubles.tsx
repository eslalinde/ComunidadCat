import { useState } from 'react';

// Parent-component contract tests replace only the form collaborator.
// Real DynamicEntityModal validation and keyboard interactions have separate tests.
export interface FormDoubleProps {
  open: boolean; title?: string; initial?: Record<string, unknown>;
  fields?: { name: string; label?: string }[]; loading?: boolean;
  onClose: () => void; onSave: (data: Record<string, unknown>) => Promise<unknown>;
}
export function FormDouble({ open, title, initial, fields, onClose, onSave, loading }: FormDoubleProps) {
  const [payload, setPayload] = useState<string | null>(null);
  const [error, setError] = useState('');
  if (!open) return null;
  return <section aria-label={title}>
    <h2>{title}</h2><span>{fields?.map((f) => f.name).join(',')}</span>
    <textarea aria-label="Datos del formulario" value={payload ?? JSON.stringify(initial ?? {})} onChange={(e) => setPayload(e.target.value)} />
    <button disabled={loading} onClick={() => { void onSave(JSON.parse(payload ?? JSON.stringify(initial ?? {}))).catch(() => setError('Error al guardar')); }}>Guardar formulario</button>
    <button onClick={onClose}>Cerrar formulario</button>{error && <p role="alert">{error}</p>}
  </section>;
}
export function DeleteDouble({ open, onClose, onConfirm, itemName, loading }: { open: boolean; onClose: () => void; onConfirm: () => Promise<unknown>; itemName?: string; loading?: boolean }) {
  return open ? <section aria-label="Confirmación"><p>{itemName}</p><button disabled={loading} onClick={() => { void onConfirm(); }}>Confirmar borrado</button><button onClick={onClose}>Cancelar borrado</button></section> : null;
}
