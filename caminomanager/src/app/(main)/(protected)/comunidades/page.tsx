'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EntityPage } from '@/components/crud';
import { communityConfig } from '@/config/entities';
import { routes } from '@/lib/routes';
import { createResponsablesTeam } from '@/lib/communityTeams';
import { toast } from 'sonner';

export default function CommunitiesPage() {
  const router = useRouter();
  const [refreshTrigger] = useState(0);

  const handleRowClick = (community: any) => {
    router.push(routes.comunidad(community.id));
  };

  const handleCreated = async (community: any) => {
    // Every community needs a leaders team: create it now so the new
    // community page is ready to assign people.
    try {
      await createResponsablesTeam({ id: community.id, number: community.number });
    } catch (err) {
      console.error('Error creating responsables team:', err);
      toast.warning('La comunidad se creó, pero no se pudo crear el equipo de responsables. Puedes crearlo desde la ficha.');
    }
    router.push(routes.comunidad(community.id));
  };

  return (
    <div className="container mx-auto">
      <EntityPage
        key={refreshTrigger}
        config={communityConfig}
        pageSize={10}
        onRowClick={handleRowClick}
        onCreated={handleCreated}
        hideDeleteInTable
      />
    </div>
  );
}
