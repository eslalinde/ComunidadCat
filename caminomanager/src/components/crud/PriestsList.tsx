import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Priest } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { Trash2, UserPlus, Plus, Phone, Mail, User, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/supabaseErrors';
import { SelectPriestModal } from './SelectPriestModal';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface PriestsListProps {
  priests: Priest[];
  loading?: boolean;
  parishId: number;
  onRefresh?: () => void;
}

const priestSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string(),
  mobile: z.string(),
  email: z.string().refine((val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Email inválido',
  }),
  role: z.boolean(),
});

type PriestFormValues = z.infer<typeof priestSchema>;

export function PriestsList({ priests, loading, parishId, onRefresh }: PriestsListProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [priestToDelete, setPriestToDelete] = useState<Priest | null>(null);
  const [editingPriest, setEditingPriest] = useState<Priest | null>(null);

  const form = useForm<PriestFormValues>({
    resolver: zodResolver(priestSchema),
    defaultValues: {
      name: '',
      phone: '',
      mobile: '',
      email: '',
      role: false,
    },
  });

  const openCreateForm = () => {
    setEditingPriest(null);
    form.reset({
      name: '',
      phone: '',
      mobile: '',
      email: '',
      role: false,
    });
    setIsFormModalOpen(true);
  };

  const openEditForm = (priest: Priest) => {
    setEditingPriest(priest);
    form.reset({
      name: priest.person?.person_name || '',
      phone: priest.person?.phone || '',
      mobile: priest.person?.mobile || '',
      email: priest.person?.email || '',
      role: priest.is_parish_priest,
    });
    setIsFormModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!priestToDelete) return;

    setDeletingId(priestToDelete.id!);
    try {
      const supabase = createClient();
      const { error, count } = await supabase
        .from('priests')
        .delete({ count: 'exact' })
        .eq('id', priestToDelete.id);

      if (error) throw error;
      if (count === 0) {
        throw new Error('No se pudo eliminar el sacerdote. Es posible que no tengas permisos.');
      }

      toast.success('Sacerdote removido correctamente');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting priest:', error);
      toast.error('Error al eliminar el sacerdote');
    } finally {
      setDeletingId(null);
      setPriestToDelete(null);
    }
  };

  const handleToggleRole = async (priest: Priest) => {
    setTogglingId(priest.id!);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('priests')
        .update({ is_parish_priest: !priest.is_parish_priest })
        .eq('id', priest.id);

      if (error) throw error;

      toast.success('Rol actualizado');
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error toggling priest role:', error);
      toast.error('Error al cambiar el rol');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSelectExistingPriest = async (personId: number, isParishPriest: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('priests')
      .insert({
        person_id: personId,
        parish_id: parishId,
        is_parish_priest: isParishPriest,
      });

    if (error) throw error;

    if (onRefresh) onRefresh();
  };

  const handleSavePriest = async (values: PriestFormValues) => {
    setIsSaving(true);
    try {
      const supabase = createClient();

      if (editingPriest) {
        // Update existing person
        const { error: personError } = await supabase
          .from('people')
          .update({
            person_name: values.name.trim(),
            phone: values.phone.trim() || null,
            mobile: values.mobile.trim() || null,
            email: values.email.trim() || null,
          })
          .eq('id', editingPriest.person_id);

        if (personError) throw personError;

        // Update priest role if changed
        if (values.role !== editingPriest.is_parish_priest) {
          const { error: priestError } = await supabase
            .from('priests')
            .update({ is_parish_priest: values.role })
            .eq('id', editingPriest.id);

          if (priestError) throw priestError;
        }
      } else {
        // Create new person
        const { data: newPerson, error: personError } = await supabase
          .from('people')
          .insert({
            person_name: values.name.trim(),
            phone: values.phone.trim() || null,
            mobile: values.mobile.trim() || null,
            email: values.email.trim() || null,
            person_type_id: 3,
          })
          .select()
          .single();

        if (personError) throw personError;

        const { error: priestError } = await supabase
          .from('priests')
          .insert({
            person_id: newPerson.id,
            parish_id: parishId,
            is_parish_priest: values.role,
          });

        if (priestError) throw priestError;
      }

      toast.success(editingPriest ? 'Sacerdote actualizado' : 'Sacerdote creado correctamente');
      if (onRefresh) onRefresh();
      setIsFormModalOpen(false);
      setEditingPriest(null);
    } catch (error: any) {
      console.error('Error saving priest:', error);
      toast.error(friendlyError(error, 'Error al guardar el sacerdote'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sacerdotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Sacerdotes ({priests.length})</CardTitle>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsSelectModalOpen(true)}
                title="Asignar sacerdote existente"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={openCreateForm}
                title="Nuevo sacerdote"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {priests.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <User className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No hay sacerdotes asignados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {priests.map((priest) => {
                const isDeleting = deletingId === priest.id;
                const isToggling = togglingId === priest.id;
                const phone = priest.person?.mobile || priest.person?.phone;
                const email = priest.person?.email;

                return (
                  <div
                    key={priest.id}
                    className="flex items-start justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {priest.person?.person_name || 'Sin nombre'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleRole(priest)}
                          disabled={isToggling}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                            priest.is_parish_priest
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                          title="Clic para cambiar rol"
                        >
                          {isToggling ? '...' : priest.is_parish_priest ? 'Parroco' : 'Vicario'}
                        </button>
                      </div>
                      {(phone || email) && (
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {phone}
                            </span>
                          )}
                          {email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="flex items-center justify-center w-10 h-10 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => openEditForm(priest)}
                        title="Editar sacerdote"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center w-10 h-10 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        onClick={() => setPriestToDelete(priest)}
                        disabled={isDeleting}
                        title="Remover sacerdote"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para seleccionar sacerdote existente */}
      <SelectPriestModal
        open={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        onSelect={handleSelectExistingPriest}
        parishId={parishId}
      />

      {/* Dialogo de confirmacion para eliminar sacerdote */}
      <ConfirmDeleteDialog
        open={priestToDelete !== null}
        onClose={() => setPriestToDelete(null)}
        onConfirm={handleDeleteConfirmed}
        title="¿Remover sacerdote?"
        itemName={priestToDelete?.person?.person_name || 'este sacerdote'}
        description="¿Estás seguro de que deseas remover a este sacerdote de la parroquia?"
        loading={deletingId !== null}
      />

      {/* Modal para crear/editar sacerdote */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editingPriest ? 'Editar Sacerdote' : 'Nuevo Sacerdote'}
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSavePriest)} className="space-y-4">
                {/* Role selector */}
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol en la parroquia:</FormLabel>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            !field.value
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => field.onChange(false)}
                        >
                          Vicario
                        </button>
                        <button
                          type="button"
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            field.value
                              ? 'bg-amber-50 border-amber-500 text-amber-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => field.onChange(true)}
                        >
                          Parroco
                        </button>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el nombre completo"
                          maxLength={256}
                          disabled={isSaving}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el numero de telefono"
                          maxLength={50}
                          disabled={isSaving}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el numero de celular"
                          maxLength={50}
                          disabled={isSaving}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electronico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Ingrese el correo electronico"
                          maxLength={256}
                          disabled={isSaving}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsFormModalOpen(false);
                      setEditingPriest(null);
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </>
  );
}
