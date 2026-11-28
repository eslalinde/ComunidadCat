"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormAlert } from "@/components/ui/form-alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormRoot,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Spinner } from "@/components/ui/spinner";

const MIN_PASSWORD_LENGTH = 6;

const signupSchema = z
  .object({
    full_name: z.string().trim().min(1, "Escribe tu nombre completo"),
    email: z
      .string()
      .min(1, "Escribe tu correo electrónico")
      .email("Revisa el formato del correo (ej. nombre@dominio.com)"),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres`),
    confirmPassword: z.string().min(1, "Repite la contraseña para confirmarla"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden todavía",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    // Validate once the user leaves a field, then re-check as they type.
    mode: "onTouched",
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Verificar si el usuario ya está autenticado
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.replace("/");
        return;
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, [router]);

  async function onSubmit(values: SignupFormValues) {
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const siteUrl = window.location.origin;

      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name },
          emailRedirectTo: `${siteUrl}/auth/confirm`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este email ya está registrado. Intenta iniciar sesión.');
        } else if (authError.message.includes('password')) {
          setError('La contraseña no cumple con los requisitos de seguridad.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.session) {
        router.replace('/');
        return;
      }

      if (data.user && !data.session) {
        setSuccess('¡Cuenta creada exitosamente! Por favor, revisa tu email para confirmar tu cuenta antes de iniciar sesión.');
      }
    } catch (err) {
      console.error('Error en signup:', err);
      setError('Error interno. Intenta nuevamente.');
    }
  }

  // Loading mientras verificamos autenticación
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full max-w-md px-4">
        {/* Logo y nombre de la app */}
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="lg" className="mb-2" />
          <p className="text-muted-foreground text-sm mt-1">Gestión de comunidades del Camino Neocatecumenal</p>
        </div>

        {/* Card de registro */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">Crear cuenta</h2>

          <Form {...form}>
            <FormRoot onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Nombre completo
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoComplete="name"
                        placeholder="Tu nombre completo"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Correo electrónico
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="tucorreo@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Contraseña
                    </FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <PasswordRequirement met={field.value.length >= MIN_PASSWORD_LENGTH} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Confirmar contraseña
                    </FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && <FormAlert tone="error">{error}</FormAlert>}

              {success && (
                <FormAlert tone="success" title="Revisa tu correo">
                  <p>{success}</p>
                  <Link
                    href="/login"
                    className="mt-2 inline-block font-medium text-primary hover:underline underline-offset-4"
                  >
                    Ir a iniciar sesión
                  </Link>
                </FormAlert>
              )}

              {!success && (
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting && (
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  )}
                  {form.formState.isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
                </Button>
              )}
            </FormRoot>
          </Form>

          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordRequirement({ met }: { met: boolean }) {
  return (
    <FormDescription
      data-met={met}
      className="flex items-center gap-1 transition-colors group-data-invalid/field:text-field-error-foreground data-[met=true]:text-field-success"
    >
      <Check
        aria-hidden="true"
        className="size-3 shrink-0 opacity-40 transition-opacity data-[met=true]:opacity-100"
        data-met={met}
      />
      Mínimo {MIN_PASSWORD_LENGTH} caracteres
      <span className="sr-only">{met ? "(cumplido)" : "(pendiente)"}</span>
    </FormDescription>
  );
}
