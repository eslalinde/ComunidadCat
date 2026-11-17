'use client';

import { FormAlert } from "@/components/ui/form-alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { friendlyError } from '@/lib/supabaseErrors';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormRoot,
} from "@/components/ui/form";
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface CommunityOption {
  id: number;
  number: string;
  actual_brothers: number | null;
}

interface PreviewData {
  brothers: number;
  teamMembers: number;
  stepLogs: number;
}

interface MergeCommunityModalProps {
  open: boolean;
  onClose: () => void;
  keepCommunityId: number;
  keepCommunityNumber: string;
  parishId: number;
  onSuccess: () => Promise<void>;
}

const mergeSchema = z.object({
  selectedCommunityId: z.string().min(1, 'Selecciona una comunidad'),
  confirmText: z.literal('FUSIONAR', { message: 'Escribe FUSIONAR para confirmar' }),
});

type MergeFormValues = z.infer<typeof mergeSchema>;

export function MergeCommunityModal({
  open,
  onClose,
  keepCommunityId,
  keepCommunityNumber,
  parishId,
  onSuccess,
}: MergeCommunityModalProps) {
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<MergeFormValues>({
    resolver: zodResolver(mergeSchema),
    defaultValues: {
      selectedCommunityId: '',
      confirmText: '' as 'FUSIONAR',
    },
  });

  const selectedCommunityId = form.watch('selectedCommunityId');

  // Cargar comunidades de la misma parroquia
  useEffect(() => {
    if (!open || !parishId) return;

    const fetchCommunities = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('communities')
        .select('id, number, actual_brothers')
        .eq('parish_id', parishId)
        .neq('id', keepCommunityId)
        .order('number');

      if (error) {
        console.error('Error fetching communities:', error);
        return;
      }
      setCommunities(data || []);
    };

    fetchCommunities();
  }, [open, parishId, keepCommunityId]);

  // Cargar preview al seleccionar comunidad
  useEffect(() => {
    if (!selectedCommunityId) {
      setPreview(null);
      return;
    }

    const communityIdNum = Number(selectedCommunityId);
    const fetchPreview = async () => {
      setLoadingPreview(true);
      const supabase = createClient();

      const [brothersRes, membersRes, logsRes] = await Promise.all([
        supabase
          .from('brothers')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityIdNum),
        supabase
          .from('belongs')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityIdNum),
        supabase
          .from('community_step_log')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityIdNum),
      ]);

      setPreview({
        brothers: brothersRes.count ?? 0,
        teamMembers: membersRes.count ?? 0,
        stepLogs: logsRes.count ?? 0,
      });
      setLoadingPreview(false);
    };

    fetchPreview();
  }, [selectedCommunityId]);

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    form.reset();
    setPreview(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const onSubmit = async (values: MergeFormValues) => {
    const communityIdNum = Number(values.selectedCommunityId);
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('merge_communities', {
        p_keep_community_id: keepCommunityId,
        p_remove_community_id: communityIdNum,
      });

      if (rpcError) throw rpcError;

      const result = data as { success: boolean; brothers_moved: number; members_moved: number; removed_community_number: string };

      toast.success('Fusión exitosa', {
        description: `Se movieron ${result.brothers_moved} hermano(s) y ${result.members_moved} miembro(s) de equipo de la Comunidad ${result.removed_community_number}.`,
      });

      resetAndClose();
      await onSuccess();
    } catch (err: any) {
      console.error('Error merging communities:', err);
      setError(friendlyError(err, 'Error al fusionar las comunidades'));
    } finally {
      setLoading(false);
    }
  };

  const selectedCommunity = communities.find((c) => c.id === Number(selectedCommunityId));

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              Fusionar Comunidades
            </DialogTitle>
            <DialogDescription>
              La Comunidad {keepCommunityNumber} absorberá a la comunidad seleccionada.
              Todos los datos se transferirán y la comunidad seleccionada será eliminada.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <FormRoot onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              {/* Comunidad principal */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium">Comunidad Principal (permanece)</p>
                <p className="text-lg font-semibold text-green-900">Comunidad {keepCommunityNumber}</p>
              </div>

              {/* Selector de comunidad a absorber */}
              <FormField
                control={form.control}
                name="selectedCommunityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seleccionar comunidad a absorber:</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={loading}>
                      <FormControl>
                        <SelectTrigger onBlur={field.onBlur}>
                          <SelectValue placeholder="Seleccionar comunidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {communities.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            Comunidad {c.number} ({c.actual_brothers ?? 0} hermanos)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vista previa */}
              {selectedCommunityId && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Vista previa de la fusión:</p>
                  {loadingPreview ? (
                    <p className="text-sm text-gray-500">Cargando datos...</p>
                  ) : preview ? (
                    <div className="space-y-1 text-sm">
                      <p>Hermanos a transferir: <span className="font-semibold">{preview.brothers}</span></p>
                      <p>Miembros de equipos: <span className="font-semibold">{preview.teamMembers}</span></p>
                      <p>Registros de bitácora: <span className="font-semibold">{preview.stepLogs}</span></p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Confirmación */}
              {selectedCommunityId && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                  <p className="text-sm text-red-700 font-medium">
                    Esta acción es IRREVERSIBLE. La Comunidad {selectedCommunity?.number} será eliminada permanentemente.
                  </p>
                  <p className="text-sm text-red-600">
                    Escribe <span className="font-bold">FUSIONAR</span> para confirmar:
                  </p>
                  <FormField
                    control={form.control}
                    name="confirmText"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            placeholder="Escribe FUSIONAR"
                            disabled={loading}
                            className="border-red-300 focus:ring-red-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <FormAlert tone="error">{error}</FormAlert>
              )}

              <DialogFooter className="gap-3">
                <Button variant="outline" type="button" onClick={resetAndClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedCommunityId || loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {loading ? 'Fusionando comunidades...' : 'Fusionar'}
                </Button>
              </DialogFooter>
            </FormRoot>
          </Form>
      </DialogContent>
    </Dialog>
  );
}
