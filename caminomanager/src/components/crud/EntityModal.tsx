import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { BaseEntity, FormField as FormFieldType } from '@/types/database';
import { X } from 'lucide-react';
import { buildZodSchema, buildDefaultValues, prepareFormData } from '@/lib/form-schema';

interface EntityModalProps<T extends BaseEntity> {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<T, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  initial?: T | null;
  fields: FormFieldType[];
  title: string;
  loading?: boolean;
}

export function EntityModal<T extends BaseEntity>({
  open,
  onClose,
  onSave,
  initial,
  fields,
  title,
  loading = false
}: EntityModalProps<T>) {
  const schema = useMemo(() => buildZodSchema(fields), [fields]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(fields, initial as Record<string, unknown> | null),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(fields, initial as Record<string, unknown> | null));
    }
  }, [open, initial, fields, form]);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      const prepared = prepareFormData(data, fields);
      await onSave(prepared as Omit<T, 'id' | 'created_at' | 'updated_at'>);
    } catch (error) {
      console.error('Error saving entity:', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-[calc(100%-2rem)] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        <h2 className="text-xl font-bold mb-5 pr-8">{title}</h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map(field => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: rhfField }) => (
                  <FormItem>
                    <FormLabel>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={(rhfField.value as string) || ''}
                          onChange={rhfField.onChange}
                          onBlur={rhfField.onBlur}
                          maxLength={field.maxLength}
                          minLength={field.minLength}
                          placeholder={field.placeholder}
                          disabled={loading}
                          rows={3}
                        />
                      ) : field.type === 'select' ? (
                        (() => {
                          const opts = field.options || [];
                          const currentVal = (rhfField.value as string) || '';
                          const selectedLabel = currentVal ? opts.find(o => String(o.value) === currentVal)?.label : null;
                          return (
                            <Select
                              value={currentVal}
                              onValueChange={rhfField.onChange}
                              disabled={loading}
                            >
                              <SelectTrigger>
                                {selectedLabel ? (
                                  <span className="truncate">{selectedLabel}</span>
                                ) : (
                                  <SelectValue placeholder={field.placeholder || "Seleccionar..."} />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {opts.map(option => (
                                  <SelectItem key={option.value} value={option.value.toString()}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()
                      ) : (
                        <Input
                          type={field.type}
                          value={(rhfField.value as string) || ''}
                          onChange={rhfField.onChange}
                          onBlur={rhfField.onBlur}
                          maxLength={field.maxLength}
                          minLength={field.minLength}
                          placeholder={field.placeholder}
                          disabled={loading}
                          className={field.name === 'code' ? 'uppercase' : ''}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
