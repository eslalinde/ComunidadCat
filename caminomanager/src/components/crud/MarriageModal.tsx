import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/utils/supabase/client";
import { friendlyError } from "@/lib/supabaseErrors";

interface MarriageModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (husbandId?: number, wifeId?: number) => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const marriageSchema = z.object({
  husband_name: z.string().min(1, "El nombre del esposo es requerido"),
  husband_phone: z.string(),
  husband_mobile: z.string(),
  husband_email: z
    .string()
    .refine((val) => val === "" || emailRegex.test(val), {
      message: "Formato de email inválido",
    }),
  wife_name: z.string().min(1, "El nombre de la esposa es requerido"),
  wife_phone: z.string(),
  wife_mobile: z.string(),
  wife_email: z
    .string()
    .refine((val) => val === "" || emailRegex.test(val), {
      message: "Formato de email inválido",
    }),
});

type MarriageFormValues = z.infer<typeof marriageSchema>;

export function MarriageModal({ open, onClose, onSuccess }: MarriageModalProps) {
  const supabase = createClient();

  const form = useForm<MarriageFormValues>({
    resolver: zodResolver(marriageSchema),
    defaultValues: {
      husband_name: "",
      husband_phone: "",
      husband_mobile: "",
      husband_email: "",
      wife_name: "",
      wife_phone: "",
      wife_mobile: "",
      wife_email: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (values: MarriageFormValues) => {
    try {
      // Create husband
      const { data: husband, error: husbandError } = await supabase
        .from("people")
        .insert({
          person_name: values.husband_name,
          phone: values.husband_phone || null,
          mobile: values.husband_mobile || null,
          email: values.husband_email || null,
          person_type_id: 1, // Matrimonio
          gender_id: 1, // Masculino
        })
        .select()
        .single();

      if (husbandError) throw husbandError;

      // Create wife
      const { data: wife, error: wifeError } = await supabase
        .from("people")
        .insert({
          person_name: values.wife_name,
          phone: values.wife_phone || null,
          mobile: values.wife_mobile || null,
          email: values.wife_email || null,
          person_type_id: 1, // Matrimonio
          gender_id: 2, // Femenino
          spouse_id: husband.id,
        })
        .select()
        .single();

      if (wifeError) throw wifeError;

      // Update husband with wife's ID
      const { error: updateError } = await supabase
        .from("people")
        .update({ spouse_id: wife.id })
        .eq("id", husband.id);

      if (updateError) throw updateError;

      onSuccess(husband.id, wife.id);
      onClose();
    } catch (error: any) {
      console.error("Error creating marriage:", error);
      form.setError("root", {
        message: friendlyError(error, "Error al crear el matrimonio"),
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-[calc(100%-2rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <h2 className="text-lg font-bold mb-4">Crear Matrimonio</h2>

        {form.formState.errors.root && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {form.formState.errors.root.message}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Husband Section */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-blue-600">Esposo</h3>

                <FormField
                  control={form.control}
                  name="husband_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Esposo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el nombre del esposo"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="husband_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el teléfono"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="husband_mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el celular"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="husband_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Ingrese el email"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Wife Section */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-pink-600">Esposa</h3>

                <FormField
                  control={form.control}
                  name="wife_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Esposa *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el nombre de la esposa"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wife_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el teléfono"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wife_mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingrese el celular"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wife_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Ingrese el email"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={form.formState.isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creando..." : "Crear Matrimonio"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
