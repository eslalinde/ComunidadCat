'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { FormAlert } from '@/components/ui/form-alert';
import { RadioGroup, RadioGroupChip } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
  RequiredMark,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { friendlyError } from '@/lib/supabaseErrors';
import { useCrud } from '@/hooks/useCrud';
import { useEntityOptions } from '@/hooks/useEntityOptions';
import { formatLocalDate, todayLocalISO } from '@/lib/dates';
import { CommunityStepLog as CommunityStepLogType } from '@/types/database';
import { Plus, Calendar, User, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const NO_OUTCOME = 'none';

const stepLogSchema = z.object({
  date_of_step: z.string().min(1, 'Indica la fecha del paso'),
  step_way_id: z.string().min(1, 'Elige el paso o etapa'),
  principal_catechist_name: z.string().trim().max(256, 'Máximo 256 caracteres'),
  outcome: z.enum(['true', 'false', NO_OUTCOME]),
  notes: z.string(),
});

type StepLogFormValues = z.infer<typeof stepLogSchema>;

const emptyEntry = (): StepLogFormValues => ({
  date_of_step: todayLocalISO(),
  step_way_id: '',
  principal_catechist_name: '',
  outcome: NO_OUTCOME,
  notes: '',
});

interface CommunityStepLogProps {
  communityId: number;
  communityNumber: string;
}

export function CommunityStepLog({ communityId, communityNumber }: CommunityStepLogProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<StepLogFormValues>({
    resolver: zodResolver(stepLogSchema),
    // Validate once the user leaves a field, then re-check as they type.
    mode: 'onTouched',
    defaultValues: emptyEntry(),
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

  const closeForm = () => {
    form.reset(emptyEntry());
    setSubmitError(null);
    setShowAddForm(false);
  };

  const handleAddEntry = async (values: StepLogFormValues) => {
    setSubmitError(null);
    try {
      await create({
        community_id: communityId,
        date_of_step: values.date_of_step,
        step_way_id: Number(values.step_way_id),
        principal_catechist_name: values.principal_catechist_name || undefined,
        outcome: values.outcome === NO_OUTCOME ? undefined : values.outcome === 'true',
        notes: values.notes.trim() || undefined,
      } as Omit<CommunityStepLogType, 'id' | 'created_at' | 'updated_at'>);
      closeForm();
    } catch (error) {
      console.error('Error adding step log entry:', error);
      setSubmitError(friendlyError(error, 'No se pudo guardar la entrada. Intenta de nuevo.'));
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
            onClick={() => (showAddForm ? closeForm() : setShowAddForm(true))}
            aria-expanded={showAddForm}
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
          <Form {...form}>
            <FormRoot
              onSubmit={form.handleSubmit(handleAddEntry)}
              className="p-4 border rounded-lg bg-gray-50 space-y-4"
            >
              <h4 className="font-medium text-gray-900">Nueva Entrada del Log</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_of_step"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Fecha del Paso <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Input type="date" className="date-input" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="step_way_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Paso/Etapa <RequiredMark />
                      </FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger onBlur={field.onBlur}>
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="principal_catechist_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catequista Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del catequista" maxLength={256} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        {/* Three short options: visible chips beat a dropdown (one click, all in view). */}
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex flex-wrap gap-2"
                        >
                          <RadioGroupChip value="true">Cerrada</RadioGroupChip>
                          <RadioGroupChip value="false">Abierta</RadioGroupChip>
                          <RadioGroupChip value={NO_OUTCOME}>Sin resultado</RadioGroupChip>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ingrese las notas del paso realizado..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError && <FormAlert tone="error">{submitError}</FormAlert>}

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  )}
                  {form.formState.isSubmitting ? 'Guardando…' : 'Guardar Entrada'}
                </Button>
                <Button type="button" onClick={closeForm} variant="outline" size="sm">
                  Cancelar
                </Button>
              </div>
            </FormRoot>
          </Form>
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
