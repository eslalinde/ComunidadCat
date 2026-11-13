'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCrud } from '@/hooks/useCrud';
import { useEntityOptions } from '@/hooks/useEntityOptions';
import { formatLocalDate, todayLocalISO } from '@/lib/dates';
import { CommunityStepLog as CommunityStepLogType } from '@/types/database';
import { Plus, Calendar, User, FileText, CheckCircle, XCircle } from 'lucide-react';

interface CommunityStepLogProps {
  communityId: number;
  communityNumber: string;
}

export function CommunityStepLog({ communityId, communityNumber }: CommunityStepLogProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<CommunityStepLogType>>({
    community_id: communityId,
    date_of_step: todayLocalISO(),
    outcome: undefined,
  });

  const foreignKeys = useMemo(() => [
    {
      foreignKey: 'step_way_id',
      tableName: 'step_ways',
      displayField: 'name',
      alias: 'step_way'
    }
  ], []);

  const { data: stepLogs, loading, create, fetchData } = useCrud<CommunityStepLogType>({
    tableName: 'community_step_log',
    searchFields: ['principal_catechist_name', 'notes'],
    defaultSort: { field: 'id', asc: false },
    foreignKeys
  });

  const { options: stepWayOptions } = useEntityOptions({ 
    tableName: 'step_ways',
    orderBy: { field: 'order_num', asc: true }
  });

  useEffect(() => {
    if (communityId) {
      fetchData({ filters: { community_id: communityId } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchData is intentionally unstable (depends on filters state); only re-run when communityId changes
  }, [communityId]);

  const handleAddEntry = async () => {
    try {
      await create(newEntry as Omit<CommunityStepLogType, 'id' | 'created_at' | 'updated_at'>);
      setNewEntry({
        community_id: communityId,
        date_of_step: todayLocalISO(),
        outcome: undefined,
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding step log entry:', error);
    }
  };

  const formatDate = (dateString?: string) => formatLocalDate(dateString);

  const getOutcomeBadge = (outcome?: boolean) => {
    if (outcome === true) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Cerrada</Badge>;
    } else if (outcome === false) {
      return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800"><XCircle className="w-3 h-3 mr-1" />Abierta</Badge>;
    }
    return <Badge variant="secondary">Sin resultado</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Log de Pasos - Comunidad {communityNumber}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Log de Pasos - Comunidad {communityNumber}
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar Entrada
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulario para agregar nueva entrada */}
        {showAddForm && (
          <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
            <h4 className="font-medium text-gray-900">Nueva Entrada del Log</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_of_step">Fecha del Paso</Label>
                <Input
                  id="date_of_step"
                  type="date"
                  value={newEntry.date_of_step || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, date_of_step: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="step_way_id">Paso/Etapa</Label>
                <Select
                  value={newEntry.step_way_id?.toString() || ''}
                  onValueChange={(value) => setNewEntry(prev => ({ ...prev, step_way_id: value ? parseInt(value) : undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el paso" />
                  </SelectTrigger>
                  <SelectContent>
                    {stepWayOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="principal_catechist_name">Catequista Principal</Label>
                <Input
                  id="principal_catechist_name"
                  value={newEntry.principal_catechist_name || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, principal_catechist_name: e.target.value }))}
                  placeholder="Nombre del catequista"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="outcome">Estado</Label>
                <Select
                  value={newEntry.outcome?.toString() || ''}
                  onValueChange={(value) => setNewEntry(prev => ({ 
                    ...prev, 
                    outcome: value === 'true' ? true : value === 'false' ? false : undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Cerrada</SelectItem>
                    <SelectItem value="false">Abierta</SelectItem>
                    <SelectItem value="">Sin resultado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={newEntry.notes || ''}
                onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Ingrese las notas del paso realizado..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddEntry} size="sm">
                Guardar Entrada
              </Button>
              <Button
                onClick={() => setShowAddForm(false)}
                variant="outline"
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Lista de entradas del log */}
        <div className="space-y-3">
          {stepLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay entradas en el log de pasos</p>
              <p className="text-sm">Agrega la primera entrada usando el botón de arriba</p>
            </div>
          ) : (
            stepLogs.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(entry.date_of_step)}</span>
                    </div>
                    {entry.step_way && (
                      <Badge variant="outline">{entry.step_way.name}</Badge>
                    )}
                    {getOutcomeBadge(entry.outcome)}
                  </div>
                </div>
                
                {entry.principal_catechist_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Catequista:</span>
                    <span>{entry.principal_catechist_name}</span>
                  </div>
                )}
                
                {entry.notes && (
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Notas:</p>
                    <p className="whitespace-pre-wrap">{entry.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
