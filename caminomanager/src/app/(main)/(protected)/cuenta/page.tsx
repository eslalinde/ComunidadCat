"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type AppRole, getRoleLabel, getRoleBadgeClass } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCommunitiesAccess } from "@/hooks/useCommunityAccess";
import { routes } from "@/lib/routes";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const { userScope } = useAuth();
  const { communities: accessCommunities, loading: loadingAccess } = useMyCommunitiesAccess();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fullname, setFullname] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [website, setWebsite] = useState<string | null>(null);
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

  const getProfile = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
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
        setFullname(data.full_name);
        setUsername(data.username);
        setWebsite(data.website);
        setAvatarUrl(data.avatar_url);
        setRole(data.role as AppRole);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setMessage({ type: 'error', text: 'Error inesperado al cargar los datos.' });
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) getProfile();
  }, [user, getProfile]);

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

  async function updateProfile({
    username,
    fullname,
    website,
    avatar_url,
  }: {
    username: string | null;
    fullname: string | null;
    website: string | null;
    avatar_url: string | null;
  }) {
    try {
      setSaving(true);
      setMessage(null);
      
      const { error } = await supabase.from("profiles").update({
        full_name: fullname,
        username,
        website,
        avatar_url,
        updated_at: new Date().toISOString(),
      }).eq('id', user?.id);
      
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6F] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Mi Perfil</h2>
        
        {/* Mostrar rol del usuario */}
        {role && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1B3A6F]">Tu rol:</span>
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
        
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">
              Email
            </label>
            <Input 
              id="email" 
              type="text" 
              value={user?.email || ''} 
              disabled 
              className="bg-gray-100"
            />
          </div>
          
          <div>
            <label htmlFor="fullName" className="block mb-1 text-sm font-medium text-gray-700">
              Nombre completo
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullname || ""}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>
          
          <div>
            <label htmlFor="username" className="block mb-1 text-sm font-medium text-gray-700">
              Nombre de usuario
            </label>
            <Input
              id="username"
              type="text"
              value={username || ""}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuario123"
            />
          </div>
          
          <div>
            <label htmlFor="website" className="block mb-1 text-sm font-medium text-gray-700">
              Sitio web
            </label>
            <Input
              id="website"
              type="url"
              value={website || ""}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://ejemplo.com"
            />
          </div>
          
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
          
          <Button
            className="w-full"
            onClick={() => updateProfile({ fullname, username, website, avatar_url })}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
} 