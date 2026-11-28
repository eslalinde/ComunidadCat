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
  FormRoot,
  RequiredMark,
} from "@/components/ui/form";
import { BaseEntity, FormField as FormFieldType } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildZodSchema, buildDefaultValues, prepareFormData, getInputAttributes } from '@/lib/form-schema';

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
    // Validate once the user leaves a field, then re-check as they type.
    mode: "onTouched",
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

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Los campos marcados con * son obligatorios.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <FormRoot onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map(field => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: rhfField }) => (
                  <FormItem>
                    <FormLabel>
                      {field.label}
                      {field.required && <RequiredMark />}
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
                          {...getInputAttributes(field)}
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

            <DialogFooter className="mt-6 gap-3 border-t border-border pt-4">
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
            </DialogFooter>
          </FormRoot>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
