'use client';

import { preparePerson, readPersonContact } from '@/lib/personContacts';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DynamicEntityModal } from './DynamicEntityModal';
import { personConfig } from '@/config/entities';
import { queryKeys } from '@/lib/queryKeys';
import { friendlyError } from '@/lib/supabaseErrors';
import { createClient } from '@/utils/supabase/client';
import { Person } from '@/types/database';

interface EditPersonModalProps {
  communityId?: number;
  /** People to edit. With two (a marriage) the user first picks one. Null closes the modal. */
  personIds: number[] | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

export function EditPersonModal({ personIds, onClose, onSaved, communityId }: EditPersonModalProps) {
  if (!personIds || personIds.length === 0) return null;
  return (
    <EditPersonModalContent
      key={personIds.join('-')}
      communityId={communityId}
      personIds={personIds}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function EditPersonModalContent({
  personIds,
  onClose,
  onSaved,
  communityId,
}: EditPersonModalProps & { personIds: number[] }) {
  const queryClient = useQueryClient();
  const [chosenId, setChosenId] = useState<number | null>(
    personIds.length === 1 ? personIds[0] : null
  );
  const [isSaving, setIsSaving] = useState(false);

  const { data: people = [], isLoading, error } = useQuery({
    queryKey: queryKeys.people.detail(personIds),
    queryFn: async (): Promise<Person[]> => {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('people')
        .select('*')
        .in('id', personIds);
      if (fetchError) throw fetchError;
      return (data || []) as Person[];
    },
    staleTime: 0,
    gcTime: 300_000,
  });

  const { user } = useAuth();
  const contact = useQuery({
    queryKey: ['person-contact', user?.id, chosenId, communityId],
    queryFn: async () => (await readPersonContact(createClient(), chosenId!, communityId)) ?? null,
    enabled: chosenId !== null, gcTime: 0, staleTime: 0, retry: false,
  });
  const person = people.find((p) => p.id === chosenId) ?? null;

  const initial = useMemo(() => person && ({ ...person, phone: contact.data?.phone ?? '', mobile: contact.data?.mobile ?? '' }), [person, contact.data]);
  const fields = useMemo(() => contact.data ? personConfig.fields : personConfig.fields.filter(f => f.name !== 'phone' && f.name !== 'mobile'), [contact.data]);

  const handleSave = async (data: Omit<Person, 'id' | 'created_at' | 'updated_at'>) => {
    if (!person?.id) return;
    setIsSaving(true);
    try {
      const cleanData: Record<string, unknown> = { ...data };
      for (const key of Object.keys(cleanData)) {
        if (cleanData[key] === '') cleanData[key] = null;
      }

      if (!contact.data || ((cleanData.phone || null) === contact.data.phone && (cleanData.mobile || null) === contact.data.mobile)) {
        delete cleanData.phone;
        delete cleanData.mobile;
      }
      const supabase = createClient();
      const { data: updatedRows, error: updateError } = await supabase
        .from('people')
        .update(await preparePerson(supabase, cleanData, person.id))
        .eq('id', person.id)
        .select('id');

      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('No tienes permisos para editar esta persona. Contacta al administrador.');
      }

      toast.success('Datos actualizados');
      await queryClient.invalidateQueries({ queryKey: queryKeys.people.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.crud.table('people') });
      await onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error updating person:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Step 1 (marriages only): choose which spouse to edit.
  if (chosenId === null) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿A quién quieres editar?</DialogTitle>
            <DialogDescription>Selecciona la persona del matrimonio.</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : error ? (
            <p className="py-4 text-center text-sm text-destructive">
              {friendlyError(error, 'Error al cargar los datos de la persona')}
            </p>
          ) : (
            <div className="grid gap-2">
              {people.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => setChosenId(p.id!)}
                >
                  <Pencil className="h-4 w-4" />
                  {p.person_name}
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: edit form (waits for the person to load so the form starts filled in).
  if (!person || contact.isLoading || contact.error) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar persona</DialogTitle>
            <DialogDescription>
              {contact.error ? 'No se pudieron cargar los teléfonos.' : error
                ? friendlyError(error, 'Error al cargar los datos de la persona')
                : isLoading || contact.isLoading
                  ? 'Cargando...'
                  : 'No se encontró la persona.'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <DynamicEntityModal
      open
      onClose={onClose}
      onSave={handleSave}
      initial={initial}
      fields={fields}
      title={`Editar: ${person.person_name}`}
      loading={isSaving}
    />
  );
}
