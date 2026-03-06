"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAdminUsers, type AdminUser, type UpdateRoleParams } from "@/hooks/useAdminUsers";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Search, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  type AppRole,
  getRoleLabel,
  getRoleBadgeClass,
  roleRequiresZone,
  roleRequiresCommunity,
  roleAcceptsScope,
} from "@/lib/permissions";
import { useQuery } from "@tanstack/react-query";

const ALL_ROLES: AppRole[] = [
  "viewer",
  "contributor",
  "admin",
  "zone_leader",
  "zone_contributor",
  "community_responsible",
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ZoneOption {
  id: number;
  name: string;
  city?: { name: string } | { name: string }[];
}

interface CommunityOption {
  id: number;
  number: string;
  parish?: { name: string } | { name: string }[];
}

function useZones() {
  const supabase = useMemo(() => createClient(), []);
  return useQuery<ZoneOption[]>({
    queryKey: ["admin", "zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_zones")
        .select("id, name, city:cities(name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ZoneOption[];
    },
  });
}

function useCommunities() {
  const supabase = useMemo(() => createClient(), []);
  return useQuery<CommunityOption[]>({
    queryKey: ["admin", "communities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, number, parish:parishes(name)")
        .order("number");
      if (error) throw error;
      return (data ?? []) as CommunityOption[];
    },
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    user: AdminUser;
    newRole: AppRole;
    zoneId: number | null;
    communityId: number | null;
    personId: number | null;
  } | null>(null);

  const { users, loading, error, updateRole, isUpdatingRole } =
    useAdminUsers(authorized);

  const { data: zones } = useZones();
  const { data: communities } = useCommunities();

  // Check admin authorization
  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: role } = await supabase.rpc("get_user_role");

      if (role !== "admin") {
        router.push("/");
        return;
      }

      setAuthorized(true);
      setAuthLoading(false);
    }

    checkAdmin();
  }, [router]);

  // Client-side search filter
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  function handleRoleChange(user: AdminUser, newRole: string) {
    if (newRole === user.role) return;
    setConfirmDialog({
      user,
      newRole: newRole as AppRole,
      zoneId: user.zone_id,
      communityId: user.community_id,
      personId: user.person_id,
    });
  }

  function confirmRoleChange() {
    if (!confirmDialog) return;
    const { newRole, zoneId, communityId, personId } = confirmDialog;

    // Validate required scope
    if (roleRequiresZone(newRole) && !zoneId) return;
    if (roleRequiresCommunity(newRole) && !communityId) return;

    const params: UpdateRoleParams = {
      targetUserId: confirmDialog.user.id,
      newRole,
      personId,
      zoneId: (roleRequiresZone(newRole) || roleAcceptsScope(newRole)) ? zoneId : null,
      communityId: (roleRequiresCommunity(newRole) || roleAcceptsScope(newRole)) ? communityId : null,
    };

    updateRole(params, {
      onSettled: () => setConfirmDialog(null),
    });
  }

  function getScopeLabel(user: AdminUser): string {
    if (user.zone_id && zones) {
      const zone = zones.find((z) => z.id === user.zone_id);
      if (zone) return `Zona: ${zone.name}`;
    }
    if (user.community_id && communities) {
      const comm = communities.find((c) => c.id === user.community_id);
      if (comm) {
        const parish = comm.parish as any;
        return `Com. ${comm.number} (${parish?.name ?? "?"})`;
      }
    }
    return "";
  }

  if (authLoading || !authorized) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3A6F] mx-auto mb-4" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-[#1B3A6F]" />
        <h1 className="text-2xl font-bold text-gray-800">
          Administración de Usuarios
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usuarios del sistema</CardTitle>
            <Badge className="bg-blue-50 text-[#1B3A6F] border-blue-200">
              {users.length} usuario{users.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-[#1B3A6F]" />
              <span className="ml-3 text-gray-600">Cargando usuarios...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
              Error al cargar usuarios: {(error as Error).message}
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Último acceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="text-center text-gray-500 py-8">
                        {searchTerm
                          ? "No se encontraron usuarios con ese criterio."
                          : "No hay usuarios registrados."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isCurrentUser = user.id === currentUserId;
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <span className="text-sm">{user.email}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {user.full_name || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isCurrentUser ? (
                            <Badge
                              className={`${getRoleBadgeClass(user.role)} cursor-not-allowed`}
                              title="No puedes cambiar tu propio rol"
                            >
                              {getRoleLabel(user.role)}
                            </Badge>
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(val) =>
                                handleRoleChange(user, val)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs border-none shadow-none w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>
                                    {getRoleLabel(r)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {getScopeLabel(user) || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {formatDate(user.last_sign_in_at)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog with scope assignment */}
      <Dialog
        open={confirmDialog !== null}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar cambio de rol</DialogTitle>
            <DialogDescription>
              Cambiar el rol de{" "}
              <strong>
                {confirmDialog?.user.full_name || confirmDialog?.user.email}
              </strong>{" "}
              de{" "}
              <Badge
                className={
                  getRoleBadgeClass(confirmDialog?.user.role ?? "viewer")
                }
              >
                {getRoleLabel(confirmDialog?.user.role ?? "viewer")}
              </Badge>{" "}
              a{" "}
              <Badge
                className={
                  getRoleBadgeClass(confirmDialog?.newRole ?? "viewer")
                }
              >
                {getRoleLabel(confirmDialog?.newRole ?? "viewer")}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {/* Scope assignment fields */}
          {confirmDialog && (roleRequiresZone(confirmDialog.newRole) || roleAcceptsScope(confirmDialog.newRole)) && (
            <div className="space-y-2">
              <Label>
                Zona asignada {roleRequiresZone(confirmDialog.newRole) ? "*" : "(opcional)"}
              </Label>
              <Select
                value={confirmDialog.zoneId?.toString() ?? "none"}
                onValueChange={(val) =>
                  setConfirmDialog((prev) =>
                    prev ? { ...prev, zoneId: val === "none" ? null : parseInt(val), communityId: val !== "none" ? null : prev.communityId } : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar zona..." />
                </SelectTrigger>
                <SelectContent>
                  {roleAcceptsScope(confirmDialog.newRole) && (
                    <SelectItem value="none">Sin zona</SelectItem>
                  )}
                  {zones?.map((z) => (
                    <SelectItem key={z.id} value={z.id.toString()}>
                      {z.name}
                      {z.city && ` (${(z.city as any).name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {confirmDialog && (roleRequiresCommunity(confirmDialog.newRole) || (roleAcceptsScope(confirmDialog.newRole) && !confirmDialog.zoneId)) && (
            <div className="space-y-2">
              <Label>
                Comunidad asignada {roleRequiresCommunity(confirmDialog.newRole) ? "*" : "(opcional)"}
              </Label>
              <Select
                value={confirmDialog.communityId?.toString() ?? "none"}
                onValueChange={(val) =>
                  setConfirmDialog((prev) =>
                    prev ? { ...prev, communityId: val === "none" ? null : parseInt(val) } : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar comunidad..." />
                </SelectTrigger>
                <SelectContent>
                  {roleAcceptsScope(confirmDialog.newRole) && (
                    <SelectItem value="none">Sin comunidad</SelectItem>
                  )}
                  {communities?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      Comunidad {c.number}
                      {c.parish && ` - ${(c.parish as any).name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmDialog(null)}
              disabled={isUpdatingRole}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRoleChange}
              disabled={
                isUpdatingRole ||
                (confirmDialog !== null &&
                  roleRequiresZone(confirmDialog.newRole) &&
                  !confirmDialog.zoneId) ||
                (confirmDialog !== null &&
                  roleRequiresCommunity(confirmDialog.newRole) &&
                  !confirmDialog.communityId)
              }
            >
              {isUpdatingRole ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
