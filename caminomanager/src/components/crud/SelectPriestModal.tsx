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

interface SelectPriestModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (personId: number, isParishPriest: boolean) => Promise<void>;
  parishId: number;
}

export function SelectPriestModal(props: SelectPriestModalProps) {
  return props.open ? <SelectPriestModalContent key={props.parishId} {...props} /> : null;
}

function SelectPriestModalContent({
  open,
  onClose,
  onSelect,
  parishId,
}: SelectPriestModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<boolean>(false); // false = Vicario, true = Párroco
  const [selectionError, setError] = useState<string | null>(null);

  const { data: people = [], isFetching: loading, error: queryError } = useQuery({
    queryKey: queryKeys.options.filtered('people', { selection: 'SelectPriestModal', parishId }),
    queryFn: async (): Promise<Person[]> => {
      const supabase = createClient();

      const { data: priestsData, error: priestsError } = await supabase
        .from('priests')
        .select('person_id')
        .eq('parish_id', parishId);

      if (priestsError) throw priestsError;

      const assignedPersonIds = new Set(
        (priestsData || []).map((p) => p.person_id)
      );

      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .eq('person_type_id', 3)
        .order('person_name', { ascending: true });

      if (peopleError) throw peopleError;

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

  const handleSelect = async () => {
    if (!selectedPersonId) {
      setError('Por favor selecciona una persona');
      return;
    }

    try {
      await onSelect(selectedPersonId, selectedRole);
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, 'Error al asignar el sacerdote'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Sacerdote Existente</DialogTitle>
          <DialogDescription>
            Selecciona un presbítero para asignarlo a esta parroquia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Buscador */}
          <div>
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Lista de personas disponibles */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Cargando presbíteros disponibles...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : filteredPeople.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? 'No se encontraron presbíteros con ese nombre'
                : 'No hay presbíteros disponibles para asignar'}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
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

          {/* Selector de rol */}
          {selectedPersonId && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Rol en la parroquia:
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    !selectedRole
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedRole(false)}
                >
                  Vicario
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedRole
                      ? 'bg-amber-50 border-amber-500 text-amber-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedRole(true)}
                >
                  Párroco
                </button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSelect} disabled={!selectedPersonId || loading}>
            Asignar Sacerdote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
