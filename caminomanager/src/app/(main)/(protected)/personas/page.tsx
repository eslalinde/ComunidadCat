'use client';

import { useState } from 'react';
import { EntityPage } from '@/components/crud';
import { MarriageModal } from '@/components/crud/MarriageModal';
import { personConfig } from '@/config/entities';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function PeoplePage() {
  const [marriageModalOpen, setMarriageModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMarriageSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto">
      <EntityPage
        key={refreshTrigger}
        config={personConfig}
        pageSize={10}
        extraActions={
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setMarriageModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Agregar matrimonio
          </Button>
        }
      />

      <MarriageModal
        open={marriageModalOpen}
        onClose={() => setMarriageModalOpen(false)}
        onSuccess={handleMarriageSuccess}
      />
    </div>
  );
}
