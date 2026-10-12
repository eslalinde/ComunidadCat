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
import { createClient } from '@/utils/supabase/client';
import { Person } from '@/types/database';
import { normalizeText } from '@/lib/utils';
import { friendlyError } from '@/lib/supabaseErrors';

interface SelectPersonForTeamModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (personId: number) => Promise<void>;
  excludePersonIds: number[];
}

export function SelectPersonForTeamModal(props: SelectPersonForTeamModalProps) {
  return props.open ? <SelectPersonForTeamModalContent key={props.excludePersonIds.join(",")} {...props} /> : null;
}

function SelectPersonForTeamModalContent({
  open,
  onClose,
  onSelect,
  excludePersonIds,
}: SelectPersonForTeamModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectionError, setError] = useState<string | null>(null);

  const { data: people = [], isFetching: loading, error: queryError } = useQuery({
    queryKey: queryKeys.options.filtered('people', { selection: 'SelectPersonForTeamModal', excludePersonIds }),
    queryFn: async (): Promise<Person[]> => {
      const supabase = createClient();

      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .order('person_name', { ascending: true });

      if (peopleError) throw peopleError;

      const excludeSet = new Set(excludePersonIds);
      const availablePeople = (peopleData || []).filter(
        (person) => !excludeSet.has(person.id!)
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

  const handleSelect = async () => {
    if (!selectedPersonId) {
      setError('Por favor selecciona una persona');
      return;
    }

    try {
      await onSelect(selectedPersonId);
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, 'Error al agregar la persona'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Persona Existente</DialogTitle>
          <DialogDescription>
            Selecciona una persona para agregarla al equipo nacional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Cargando personas disponibles...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : filteredPeople.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? 'No se encontraron personas con ese nombre'
                : 'No hay personas disponibles'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPeople.map((person) => (
                <div
                  key={person.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPersonId === person.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPersonId(person.id!)}
                >
                  <div className="font-medium">{person.person_name}</div>
                  <div className="text-sm text-gray-500">
                    {person.mobile && `Celular: ${person.mobile}`}
                    {person.email && ` · Email: ${person.email}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSelect} disabled={!selectedPersonId || loading}>
            Agregar Persona
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
