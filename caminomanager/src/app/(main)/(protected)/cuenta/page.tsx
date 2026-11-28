"use client";
import { FormAlert } from "@/components/ui/form-alert";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { type AppRole, getRoleLabel, getRoleBadgeClass } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCommunitiesAccess } from "@/hooks/useCommunityAccess";
import { routes } from "@/lib/routes";
import { Spinner } from "@/components/ui/spinner";

const profileSchema = z.object({
  fullname: z.string().trim(),
  username: z
    .string()
    .trim()
    .refine((value) => value === "" || value.length >= 3, "Usa al menos 3 caracteres")
    .refine(
      (value) => value === "" || /^[a-zA-Z0-9._-]+$/.test(value),
      "Usa solo letras, números, punto, guion o guion bajo"
    ),
  website: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^https?:\/\/\S+\.\S+/.test(value),
      "Escribe la dirección completa (ej. https://ejemplo.com)"
    ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const { userScope } = useAuth();
  const { communities: accessCommunities, loading: loadingAccess } = useMyCommunitiesAccess();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // Validate once the user leaves a field, then re-check as they type.
    mode: "onTouched",
    defaultValues: { fullname: "", username: "", website: "" },
  });
  const [avatar_url, setAvatarUrl] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);

  // Obtener usuario actual
  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push('/login');
        return;
      }
      
      setUser(data.user);
    }
    fetchUser();
  }, [supabase, router]);

  useEffect(() => {
    async function getProfile() {
      if (!user) return;
      try {
        const { data, error, status } = await supabase
          .from("profiles")
          .select(`full_name, username, website, avatar_url, role`)
          .eq("id", user.id)
          .single();
        if (error && status !== 406) {
          console.error("Error loading profile:", error);
          setMessage({ type: 'error', text: 'Error al cargar los datos del perfil.' });
          return;
        }
        if (data) {
          form.reset({
            fullname: data.full_name ?? "",
            username: data.username ?? "",
            website: data.website ?? "",
          });
          setAvatarUrl(data.avatar_url);
          setRole(data.role as AppRole);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        setMessage({ type: 'error', text: 'Error inesperado al cargar los datos.' });
      } finally {
        setLoading(false);
      }
    }
    if (user) void getProfile();
  }, [user, supabase, form]);

  useEffect(() => {
    let cancelled = false;
    async function loadScopeLabel() {
      if (!userScope) {
        if (!cancelled) setScopeLabel(null);
        return;
      }
      if (userScope.zone_id) {
        const { data } = await supabase
          .from('city_zones')
          .select('name')
          .eq('id', userScope.zone_id)
          .single();
        if (!cancelled) {
          setScopeLabel(data?.name ? `Zona ${data.name}` : `Zona #${userScope.zone_id}`);
        }
        return;
      }
      if (userScope.community_id) {
        const { data } = await supabase
          .from('communities')
          .select('number, parish:parishes(name)')
          .eq('id', userScope.community_id)
          .single();
        if (!cancelled) {
          const parishName = (data?.parish as { name?: string } | null)?.name;
          const number = data?.number;
          if (number && parishName) {
            setScopeLabel(`Comunidad ${number} — ${parishName}`);
          } else if (number) {
            setScopeLabel(`Comunidad ${number}`);
          } else {
            setScopeLabel(`Comunidad #${userScope.community_id}`);
          }
        }
        return;
      }
      if (!cancelled) setScopeLabel(null);
    }
    loadScopeLabel();
    return () => {
      cancelled = true;
    };
  }, [userScope, supabase]);

  async function updateProfile({ fullname, username, website }: ProfileFormValues) {
    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase.from("profiles").update({
        full_name: fullname || null,
        username: username || null,
        website: website || null,
        avatar_url,
        updated_at: new Date().toISOString(),
      }).eq('id', user?.id);

      if (error?.code === "23505") {
        form.setError("username", { message: "Ese nombre de usuario ya está en uso" });
        return;
      }
      if (error) {
        console.error("Error updating profile:", error);
        setMessage({ type: 'error', text: 'Error al actualizar el perfil.' });
        return;
      }
      
      setMessage({ type: 'success', text: '¡Perfil actualizado correctamente!' });
    } catch (error) {
      console.error("Unexpected error:", error);
      setMessage({ type: 'error', text: 'Error inesperado al guardar.' });
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-card rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Mi Perfil</h2>
        
        {/* Mostrar rol del usuario */}
        {role && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">Tu rol:</span>
              <Badge className={getRoleBadgeClass(role)}>{getRoleLabel(role)}</Badge>
            </div>
            {scopeLabel && (
              <p className="text-xs text-blue-700" data-testid="scope-label">
                Alcance: {scopeLabel}
              </p>
            )}
            {!scopeLabel && (role === 'admin' || role === 'contributor') && (
              <p className="text-xs text-blue-700" data-testid="scope-label">
                Alcance: Acceso global a todas las zonas y comunidades.
              </p>
            )}
            {role === 'viewer' && !userScope?.zone_id && !userScope?.community_id && accessCommunities.length === 0 && (
              <p className="text-xs text-blue-700" data-testid="scope-label">
                Sin acceso asignado. Contacta a un administrador para que te otorgue permisos.
              </p>
            )}
          </div>
        )}

        {/* Comunidades con acceso explícito */}
        {!loadingAccess && accessCommunities.length > 0 && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              Comunidades con acceso otorgado:
            </p>
            <div className="space-y-1">
              {accessCommunities.map((c) => (
                <Link
                  key={c.community_id}
                  href={routes.comunidad(c.community_id)}
                  className="block text-sm text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  Comunidad {c.community_number}
                  {c.parish_name && ` - ${c.parish_name}`}
                </Link>
              ))}
            </div>
          </div>
        )}
        
        <Form {...form}>
          <FormRoot onSubmit={form.handleSubmit(updateProfile)} className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm leading-none font-medium text-foreground">
                Email
              </label>
              <Input id="email" type="text" value={user?.email || ''} disabled className="bg-muted" />
              <p className="text-xs leading-4 text-muted-foreground">
                El correo no se puede cambiar desde aquí.
              </p>
            </div>

            <FormField
              control={form.control}
              name="fullname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input type="text" autoComplete="name" placeholder="Tu nombre completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de usuario</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      autoComplete="username"
                      autoCapitalize="off"
                      spellCheck={false}
                      placeholder="usuario123"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Mínimo 3 caracteres, sin espacios.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sitio web</FormLabel>
                  <FormControl>
                    <Input type="url" inputMode="url" autoComplete="url" placeholder="https://ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {message && (
              <FormAlert tone={message.type === 'success' ? 'success' : 'error'}>
                {message.text}
              </FormAlert>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </FormRoot>
        </Form>
      </div>
    </div>
  );
} 