"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { getSafeRedirectPath } from "@/lib/routes";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Spinner } from "@/components/ui/spinner";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Escribe tu correo electrónico")
    .email("Revisa el formato del correo (ej. nombre@dominio.com)"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'email_confirmation_failed'
      ? 'Error al confirmar el email. Por favor, intenta registrarte de nuevo o contacta soporte.'
      : null
  );

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    // Validate once the user leaves a field, then re-check as they type.
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  // Verificar si el usuario ya está autenticado
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const redirectTo = getSafeRedirectPath(searchParams.get('redirectTo'));
          router.replace(redirectTo);
          return;
        }
      } catch {
        // Network error — show login form
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, [router, searchParams]);


  async function onSubmit(values: LoginFormValues) {
    setError(null);

    try {
      const redirectTo = getSafeRedirectPath(searchParams.get('redirectTo'));
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Credenciales inválidas. Verifica tu email y contraseña.');
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Por favor, confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
        } else {
          setError(authError.message);
        }
        return;
      }

      router.replace(redirectTo);
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.');
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

        {/* Card de login */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6 text-center">Iniciar sesión</h2>

          <Form {...form}>
            <FormRoot onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      <PasswordInput autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <FormAlert tone="error">{error}</FormAlert>}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                )}
                {form.formState.isSubmitting ? "Ingresando…" : "Ingresar"}
              </Button>
            </FormRoot>
          </Form>

          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80 font-medium">
              Crear cuenta
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/publico" className="font-medium text-primary hover:underline">
            Conoce ComunidadCat →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
