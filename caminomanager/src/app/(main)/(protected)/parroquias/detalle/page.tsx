'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useParishData } from '@/hooks/useParishData';
import { PriestsList } from '@/components/crud/PriestsList';
import { ParishCatechesisHistory } from '@/components/crud/ParishCatechesisHistory';
import { DynamicEntityModal } from '@/components/crud/DynamicEntityModal';
import { parishConfig } from '@/config/entities';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, MapPin, Phone, Mail, Church, Users, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Parish } from '@/types/database';
import { routes } from '@/lib/routes';

function getStepColor(orderNum?: number): string {
  if (!orderNum) return 'bg-gray-100 text-gray-600 border-gray-200';
  if (orderNum <= 3) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (orderNum <= 6) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (orderNum <= 9) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function ParishDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parishId = parseInt(searchParams.get('id') as string);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    parish,
    priests,
    communities,
    loading,
    error,
    invalidateDetail,
    invalidatePriests,
  } = useParishData(parishId);

  const totalBrothers = useMemo(() => {
    return communities.reduce((sum, c) => sum + (c.actual_brothers || 0), 0);
  }, [communities]);

  const handleSave = async (data: Omit<Parish, 'id' | 'created_at' | 'updated_at'>) => {
    if (!parish?.id) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: updatedRows, error: updateError } = await supabase
        .from('parishes')
        .update(data)
        .eq('id', parish.id)
        .select();

      if (updateError) throw updateError;

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('No tienes permisos para editar parroquias. Contacta al administrador para que te asigne el rol de contributor o admin.');
      }

      await invalidateDetail();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating parish:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  const contactItems = [
    parish?.address && { icon: MapPin, text: parish.address },
    parish?.phone && { icon: Phone, text: parish.phone },
    parish?.email && { icon: Mail, text: parish.email },
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  const cityZoneText = [
    parish?.zone?.name,
    parish?.city?.name,
  ].filter(Boolean).join(', ');

  return (
    <div className="container mx-auto space-y-6">
      {/* Unified Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(routes.parroquias)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Parroquias
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {parish?.name || 'Cargando...'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {parish?.diocese?.name && (
              <Badge variant="outline" className="text-sm font-normal">
                {parish.diocese.name}
              </Badge>
            )}
            {cityZoneText && (
              <span className="text-sm text-gray-500">{cityZoneText}</span>
            )}
          </div>
        </div>

        {/* Contact info - inline, only non-empty fields */}
        {contactItems.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
            {contactItems.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <item.icon className="w-3.5 h-3.5 text-gray-400" />
                {item.text}
              </span>
            ))}
          </div>
        )}

        {/* Stats strip */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                <Church className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{communities.length}</p>
                <p className="text-xs text-gray-500">Comunidades</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50">
                <Users className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{priests.length}</p>
                <p className="text-xs text-gray-500">Sacerdotes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-semibold text-gray-900">{totalBrothers}</p>
                <p className="text-xs text-gray-500">Hermanos</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two columns: Communities + Priests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communities with step badges */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comunidades ({communities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : communities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Church className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No hay comunidades en esta parroquia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {communities.map((community) => (
                  <div
                    key={community.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors group"
                    onClick={() => router.push(routes.comunidad(community.id!))}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-semibold text-gray-900 shrink-0">
                        #{community.number}
                      </span>
                      {community.step_way && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStepColor((community.step_way as any)?.order_num)}`}>
                          {community.step_way.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {community.actual_brothers ? (
                        <span className="text-sm text-gray-500">
                          {community.actual_brothers} hnos
                        </span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priests - compact cards */}
        <PriestsList
          priests={priests}
          loading={loading}
          parishId={parishId}
          onRefresh={invalidatePriests}
        />
      </div>

      {/* Full-width: Catechesis History */}
      <ParishCatechesisHistory parishId={parishId} parishName={parish?.name || ''} />

      {/* Modal de edicion */}
      <DynamicEntityModal
        key={`parish-edit-${parish?.id ?? 'none'}-${isEditModalOpen ? 'open' : 'closed'}`}
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
        initial={parish}
        fields={parishConfig.fields}
        title="Editar Parroquia"
        loading={isSaving}
        size={parishConfig.formSize}
      />
    </div>
  );
}

export default function ParishDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6F]"></div>
        </div>
      }
    >
      <ParishDetailContent />
    </Suspense>
  );
}
