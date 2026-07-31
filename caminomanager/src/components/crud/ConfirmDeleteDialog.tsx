'use client';

import { useState, type MouseEvent } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  /** Name of the item being deleted, shown prominently (e.g., "Juan Pérez", "Comunidad 5") */
  itemName?: string;
  /** Optional details shown in a preview box (e.g., "3 hermanos, 2 equipos") */
  preview?: string[];
  loading?: boolean;
  /** The word the user must type to confirm. Defaults to "ELIMINAR" */
  confirmWord?: string;
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  preview,
  loading = false,
  confirmWord = 'eliminar',
}: ConfirmDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  // Reset text when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmText('');
      onClose();
    }
  };

  const isConfirmValid = confirmText.toUpperCase() === confirmWord.toUpperCase();

  const handleConfirm = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!isConfirmValid || loading) return;
    await onConfirm();
    setConfirmText('');
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Prominent item name */}
            {itemName && (
              <div className="px-4 py-3 bg-red-100 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-base font-bold text-red-900 break-words">
                  {itemName}
                </p>
              </div>
            )}

            {/* Preview of what will be affected */}
            {preview && preview.length > 0 && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                <p className="text-sm font-semibold text-red-800 mb-2">
                  Se eliminará permanentemente:
                </p>
                <ul className="space-y-1.5 text-sm text-red-700 font-medium">
                  {preview.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirmation text input */}
            <Field className="rounded-lg border border-red-200 bg-red-50 p-3">
              <FieldDescription className="font-medium text-red-700">
                Esta acción es IRREVERSIBLE.
              </FieldDescription>
              <FieldLabel htmlFor="delete-confirmation" className="text-red-600">
                Escribe <span className="font-bold">{confirmWord}</span> para confirmar:
              </FieldLabel>
              <Input
                id="delete-confirmation"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Escribe ${confirmWord}`}
                disabled={loading}
                autoComplete="off"
                className="border-red-300 focus:ring-red-500"
              />
            </Field>
          </div>

          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel disabled={loading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!isConfirmValid || loading}
            >
              {loading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
