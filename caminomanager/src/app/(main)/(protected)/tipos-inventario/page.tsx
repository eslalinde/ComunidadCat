"use client";
import { EntityPage } from '@/components/crud/EntityPage';
import { inventoryItemTypeConfig } from '@/config/entities';

export default function TiposInventarioPage() {
  return (
    <div className="container mx-auto">
      <EntityPage config={inventoryItemTypeConfig} pageSize={10} />
    </div>
  );
}
