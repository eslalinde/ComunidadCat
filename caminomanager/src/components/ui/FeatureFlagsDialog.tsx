'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface FeatureFlagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureFlagsDialog({ open, onOpenChange }: FeatureFlagsDialogProps) {
  const { availableFlags, isEnabled, toggleFlag } = useFeatureFlags();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Funcionalidades</DialogTitle>
        </DialogHeader>
        {availableFlags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay funcionalidades disponibles para tu rol.
          </p>
        ) : (
          <div className="space-y-4 py-2">
            {availableFlags.map((flag) => (
              <div
                key={flag.key}
                className="flex items-start justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-none">{flag.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                </div>
                <Switch
                  checked={isEnabled(flag.key)}
                  onCheckedChange={() => toggleFlag(flag.key)}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
