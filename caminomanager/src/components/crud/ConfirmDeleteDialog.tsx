'use client';

import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Trash2, type LucideIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  /** Heading above the preview list. */
  previewTitle?: string;
  loading?: boolean;
  /**
   * Ask the user to type `confirmWord` before enabling the action. Reserve it
   * for high-impact deletions that cascade (communities, teams, catalog
   * records); simple removals should use a single confirmation click.
   */
  requireTypedConfirmation?: boolean;
  /** The word the user must type to confirm. Defaults to "eliminar" */
  confirmWord?: string;
  /** Label of the destructive button. Defaults to "Eliminar" */
  confirmLabel?: string;
  /** Label shown while the action is running. Defaults to "Eliminando..." */
  loadingLabel?: string;
  /** Icon in the header badge. Use UserMinus for removals that keep the person. */
  icon?: LucideIcon;
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  preview,
  previewTitle = 'También se eliminará:',
  loading = false,
  requireTypedConfirmation = true,
  confirmWord = 'eliminar',
  confirmLabel = 'Eliminar',
  loadingLabel = 'Eliminando...',
  icon: Icon = Trash2,
}: ConfirmDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  // Reset text when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmText('');
      onClose();
    }
  };

  const isConfirmValid =
    !requireTypedConfirmation ||
    confirmText.trim().toUpperCase() === confirmWord.toUpperCase();

  const confirm = async () => {
    if (!isConfirmValid || loading) return;
    await onConfirm();
    setConfirmText('');
  };

  const handleConfirmClick = async (event: MouseEvent<HTMLButtonElement>) => {
    // Keep the dialog open until the caller closes it after the request.
    event.preventDefault();
    await confirm();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void confirm();
    }
  };

  const hasPreview = preview && preview.length > 0;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md gap-5">
        <AlertDialogHeader className="flex-row items-start gap-3 text-left sm:gap-4">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10"
          >
            <Icon className="size-5 text-destructive" />
          </div>
          <div className="min-w-0 space-y-1.5 pt-0.5">
            <AlertDialogTitle className="text-base font-semibold leading-snug text-foreground">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {(itemName || hasPreview) && (
          <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
            {itemName && (
              <p className="break-words font-medium text-foreground">{itemName}</p>
            )}
            {hasPreview && (
              <div className={itemName ? 'mt-2.5 border-t pt-2.5' : undefined}>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {previewTitle}
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {preview.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 break-words">
                      <span
                        aria-hidden="true"
                        className="mt-2 inline-block size-1 shrink-0 rounded-full bg-muted-foreground/60"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {requireTypedConfirmation && (
          <div className="space-y-2">
            <Label htmlFor="delete-confirmation" className="font-normal text-muted-foreground">
              <span>
                Escribe{' '}
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                  {confirmWord}
                </span>{' '}
                para confirmar
              </span>
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={`Escribe ${confirmWord}`}
              disabled={loading}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmClick}
            disabled={!isConfirmValid || loading}
          >
            {loading ? loadingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
