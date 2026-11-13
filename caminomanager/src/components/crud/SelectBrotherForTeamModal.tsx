'use client';

import { useState, useMemo } from 'react';
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
import { MergedBrother } from '@/hooks/useCommunityData';
import { Belongs } from '@/types/database';
import { cn, normalizeText } from '@/lib/utils';
import { friendlyError } from '@/lib/supabaseErrors';

interface SelectBrotherForTeamModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (personIds: number[]) => Promise<void>;
  brothers: MergedBrother[];
  teamMembers: Belongs[];
}

export function SelectBrotherForTeamModal({
  open,
  onClose,
  onSelect,
  brothers,
  teamMembers,
}: SelectBrotherForTeamModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrotherIds, setSelectedBrotherIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out brothers already in the team
  const availableBrothers = useMemo(() => {
    const teamPersonIds = new Set(teamMembers.map((m) => m.person_id));
    return brothers.filter(
      (b) => !b.personIds.every((pid) => teamPersonIds.has(pid))
    );
  }, [brothers, teamMembers]);

  const filteredBrothers = availableBrothers.filter((b) =>
    normalizeText(b.name).includes(normalizeText(searchTerm))
  );

  const reset = () => {
    setSearchTerm('');
    setSelectedBrotherIds(new Set());
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggle = (brotherId: string) => {
    setError(null);
    setSelectedBrotherIds((prev) => {
      const next = new Set(prev);
      if (next.has(brotherId)) next.delete(brotherId);
      else next.add(brotherId);
      return next;
    });
  };

  const handleSelect = async () => {
    if (selectedBrotherIds.size === 0) {
      setError('Por favor selecciona al menos un hermano');
      return;
    }

    const personIds = availableBrothers
      .filter((b) => selectedBrotherIds.has(b.id))
      .flatMap((b) => b.personIds);
    if (personIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSelect(personIds);
      handleClose();
    } catch (err: any) {
      setError(friendlyError(err, 'Error al agregar al equipo'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const count = selectedBrotherIds.size;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Hermanos al Equipo</DialogTitle>
          <DialogDescription>
            Marca uno o varios hermanos de la comunidad para agregarlos a este equipo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-center py-2 text-red-500">{error}</div>
          )}

          {filteredBrothers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? 'No se encontraron hermanos con ese nombre'
                : 'Todos los hermanos ya están en este equipo'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredBrothers.map((brother) => {
                const checked = selectedBrotherIds.has(brother.id);
                return (
                  <label
                    key={brother.id}
                    className={cn(
                      'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      checked ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(brother.id)}
                      className="mt-0.5"
                      aria-label={brother.name}
                    />
                    <div>
                      <div className="font-medium">
                        {brother.name}
                        {brother.isMarriage && (
                          <span className="ml-2 text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded">
                            Matrimonio
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {brother.carisma && `${brother.carisma}`}
                        {brother.celular && ` · Celular: ${brother.celular}`}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSelect} disabled={count === 0 || isSubmitting}>
            {isSubmitting
              ? 'Agregando...'
              : count > 1
                ? `Agregar ${count} al Equipo`
                : 'Agregar al Equipo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
