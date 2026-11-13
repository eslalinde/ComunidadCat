'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  /** People to edit. With two (a marriage) the user first picks one. Null closes the modal. */
  personIds: number[] | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

export function EditPersonModal({ personIds, onClose, onSaved }: EditPersonModalProps) {
  if (!personIds || personIds.length === 0) return null;
  return (
    <EditPersonModalContent
      key={personIds.join('-')}
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

  const person = people.find((p) => p.id === chosenId) ?? null;

  const handleSave = async (data: Omit<Person, 'id' | 'created_at' | 'updated_at'>) => {
    if (!person?.id) return;
    setIsSaving(true);
    try {
      const cleanData: Record<string, unknown> = { ...data };
      for (const key of Object.keys(cleanData)) {
        if (cleanData[key] === '') cleanData[key] = null;
      }

      const supabase = createClient();
      const { data: updatedRows, error: updateError } = await supabase
        .from('people')
        .update(cleanData)
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
  if (!person) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar persona</DialogTitle>
            <DialogDescription>
              {error
                ? friendlyError(error, 'Error al cargar los datos de la persona')
                : isLoading
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
      initial={person}
      fields={personConfig.fields}
      title={`Editar: ${person.person_name}`}
      loading={isSaving}
    />
  );
}
