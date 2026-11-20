import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { readPersonContact } from '@/lib/personContacts';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';

export function BrotherContact({ personIds, communityId }: { personIds: number[]; communityId: number }) {
  const { user, userScope } = useAuth();
  const [visible, setVisible] = useState(false);
  const canView = !!user && !!userScope && userScope.role !== 'viewer';
  // Mount the query only while visible; hiding it immediately discards its data.
  if (!canView) return <span>—</span>;
  return <div className="print:hidden">
    <Button type="button" size="sm" variant="ghost" aria-expanded={visible} onClick={() => setVisible(!visible)}>
      {visible ? 'Ocultar teléfonos' : 'Ver teléfonos'}
    </Button>
    {visible && <ContactNumbers userId={user.id} personIds={personIds} communityId={communityId} />}
  </div>;
}

function ContactNumbers({userId, personIds, communityId}: { userId:string; personIds:number[]; communityId:number }) {
  const query = useQuery({
    queryKey: ['brother-contact', userId, communityId, personIds],
    queryFn: () => Promise.all(personIds.map(id => readPersonContact(createClient(),id,communityId))),
    gcTime: 0, retry:false,
  });
  if (query.isLoading) return <span role="status">Cargando…</span>;
  if (query.error) return <span role="alert">Error al consultar teléfonos.</span>;
  return <div>{query.data?.map((contact, index) =>
    <div key={personIds[index]}>{contact ? [contact.phone, contact.mobile].filter(Boolean).join(' / ') || 'Sin teléfono' : 'Sin acceso'}</div>
  )}</div>;
}
