'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/utils/supabase/client';
import { Person } from '@/types/database';
import { cn, normalizeText } from '@/lib/utils';
import { friendlyError } from '@/lib/supabaseErrors';

interface SelectBrotherModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (personIds: number[]) => Promise<void>;
  communityId: number;
}

export function SelectBrotherModal(props: SelectBrotherModalProps) {
  return props.open ? <SelectBrotherModalContent key={props.communityId} {...props} /> : null;
}

function SelectBrotherModalContent({
  open,
  onClose,
  onSelect,
  communityId,
}: SelectBrotherModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectionError, setError] = useState<string | null>(null);

  const { data: people = [], isFetching: loading, error: queryError } = useQuery({
    queryKey: queryKeys.options.filtered('people', { selection: 'SelectBrotherModal', communityId }),
    queryFn: async (): Promise<Person[]> => {
      const supabase = createClient();

      // Obtener todos los IDs de personas que ya tienen comunidad asignada
      const { data: brothersData, error: brothersError } = await supabase
        .from('brothers')
        .select('person_id');

      if (brothersError) throw brothersError;

      const assignedPersonIds = new Set(
        (brothersData || []).map((b) => b.person_id)
      );

      // Obtener todas las personas que NO están en la lista de hermanos asignados
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .order('person_name', { ascending: true });

      if (peopleError) throw peopleError;

      // Filtrar personas que no tienen comunidad asignada
      const availablePeople = (peopleData || []).filter(
        (person) => !assignedPersonIds.has(person.id!)
      );

      return availablePeople;
    },
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnMount: 'always',
  });
  const error = selectionError ?? (queryError ? friendlyError(queryError, 'Error al cargar las personas disponibles') : null);

  const filteredPeople = people.filter((person) =>
    normalizeText(person.person_name).includes(normalizeText(searchTerm))
  );

  const toggle = (personId: number) => {
    setError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  const handleSelect = async () => {
    if (selectedIds.size === 0) {
      setError('Por favor selecciona al menos una persona');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSelect([...selectedIds]);
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, 'Error al agregar el hermano'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const count = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Hermanos Existentes</DialogTitle>
            <DialogDescription>
              Marca una o varias personas sin comunidad asignada para agregarlas
              a esta comunidad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Buscador */}
            <div>
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            {selectionError && people.length > 0 && (
              <div className="text-center text-sm text-destructive">{selectionError}</div>
            )}

            {/* Lista de personas disponibles */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Cargando personas disponibles...
              </div>
            ) : error && people.length === 0 ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : filteredPeople.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm
                  ? 'No se encontraron personas con ese nombre'
                  : 'No hay personas disponibles sin comunidad asignada'}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPeople.map((person) => {
                  const checked = selectedIds.has(person.id!);
                  return (
                    <label
                      key={person.id}
                      className={cn(
                        'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                        checked ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(person.id!)}
                        className="mt-0.5"
                        aria-label={person.person_name}
                      />
                      <div>
                        <div className="font-medium">{person.person_name}</div>
                        <div className="text-sm text-gray-500">
                          {person.mobile && `Celular: ${person.mobile}`}
                          {person.email && ` • Email: ${person.email}`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSelect} disabled={count === 0 || loading || isSubmitting}>
              {isSubmitting
                ? 'Agregando...'
                : count > 1
                  ? `Agregar ${count} hermanos`
                  : 'Agregar Hermano'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
