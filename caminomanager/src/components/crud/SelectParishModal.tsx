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
import { Parish } from '@/types/database';
import { normalizeText } from '@/lib/utils';
import { friendlyError } from '@/lib/supabaseErrors';

interface SelectParishModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (parishId: number) => Promise<void>;
  excludeParishIds: number[];
}

export function SelectParishModal(props: SelectParishModalProps) {
  return props.open ? <SelectParishModalContent key={props.excludeParishIds.join(",")} {...props} /> : null;
}

function SelectParishModalContent({
  open,
  onClose,
  onSelect,
  excludeParishIds,
}: SelectParishModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParishId, setSelectedParishId] = useState<number | null>(null);
  const [selectionError, setError] = useState<string | null>(null);

  const { data: parishes = [], isFetching: loading, error: queryError } = useQuery({
    queryKey: queryKeys.options.filtered('parishes', { selection: 'SelectParishModal', excludeParishIds }),
    queryFn: async (): Promise<Parish[]> => {
      const supabase = createClient();

      const { data: parishData, error: parishError } = await supabase
        .from('parishes')
        .select('*, diocese:dioceses(name)')
        .order('name', { ascending: true });

      if (parishError) throw parishError;

      const excludeSet = new Set(excludeParishIds);
      const availableParishes = (parishData || []).filter(
        (parish) => !excludeSet.has(parish.id!)
      );

      return availableParishes;
    },
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnMount: 'always',
  });
  const error = selectionError ?? (queryError ? friendlyError(queryError, 'Error al cargar las parroquias disponibles') : null);

  const filteredParishes = parishes.filter((parish) =>
    normalizeText(parish.name).includes(normalizeText(searchTerm))
  );

  const handleSelect = async () => {
    if (!selectedParishId) {
      setError('Por favor selecciona una parroquia');
      return;
    }

    try {
      await onSelect(selectedParishId);
      onClose();
    } catch (err: any) {
      setError(friendlyError(err, 'Error al agregar la parroquia'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Parroquia</DialogTitle>
          <DialogDescription>
            Selecciona una parroquia para vincularla al equipo nacional.
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
              Cargando parroquias disponibles...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : filteredParishes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? 'No se encontraron parroquias con ese nombre'
                : 'No hay parroquias disponibles'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredParishes.map((parish) => (
                <div
                  key={parish.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedParishId === parish.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedParishId(parish.id!)}
                >
                  <div className="font-medium">{parish.name}</div>
                  <div className="text-sm text-gray-500">
                    {parish.diocese?.name && `Diócesis: ${parish.diocese.name}`}
                    {parish.address && ` · ${parish.address}`}
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
          <Button onClick={handleSelect} disabled={!selectedParishId || loading}>
            Agregar Parroquia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
