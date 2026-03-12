'use client';

import { useState, useMemo } from 'react';
import { useCommunityAccessUsers, type CommunityAccessUser } from '@/hooks/useCommunityAccess';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { getRoleLabel, getRoleBadgeClass } from '@/lib/permissions';
import { UserPlus, Trash2, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  communityId: number;
}

export function CommunityAccessSection({ communityId }: Props) {
  const [open, setOpen] = useState(false);
  const {
    accessUsers,
    loading,
    grantAccess,
    revokeAccess,
    isGranting,
    isRevoking,
  } = useCommunityAccessUsers(communityId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<CommunityAccessUser | null>(null);

  // Fetch all users for the "add" dialog (only when dialog is open)
  const { users: allUsers, loading: loadingUsers } = useAdminUsers(isAddOpen);

  // Filter out users who already have access
  const availableUsers = useMemo(() => {
    const grantedIds = new Set(accessUsers.map((u) => u.user_id));
    return allUsers.filter((u) => !grantedIds.has(u.id));
  }, [allUsers, accessUsers]);

  function handleGrant() {
    if (!selectedUserId) return;
    grantAccess(selectedUserId, {
      onSuccess: () => {
        toast.success('Acceso otorgado');
        setIsAddOpen(false);
        setSelectedUserId(null);
      },
      onError: (err: any) => {
        toast.error(err?.message ?? 'Error al otorgar acceso');
      },
    });
  }

  function handleRevoke() {
    if (!revokeTarget) return;
    revokeAccess(revokeTarget.user_id, {
      onSuccess: () => {
        toast.success('Acceso revocado');
        setRevokeTarget(null);
      },
      onError: (err: any) => {
        toast.error(err?.message ?? 'Error al revocar acceso');
      },
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuarios</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="sm:max-w-md w-full flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios con acceso
            </SheetTitle>
          </SheetHeader>

          {/* Add button */}
          <div className="px-4 pb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Agregar usuario
            </Button>
          </div>

          {/* Users list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : accessUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay usuarios con acceso especial a esta comunidad.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {accessUsers.map((user) => (
                  <div
                    key={`${user.user_id}-${user.source}`}
                    className="flex items-center justify-between py-3 px-3 rounded-lg bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name || user.email}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 truncate">{user.email}</span>
                        {user.source === 'profile' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600">
                            Asignado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge className={`text-xs ${getRoleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      {user.source === 'grant' ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setRevokeTarget(user)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <div className="w-9" /> /* spacer for alignment */
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add user dialog */}
      <Dialog open={isAddOpen} onOpenChange={(o) => !o && setIsAddOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Otorgar acceso a comunidad</DialogTitle>
            <DialogDescription>
              Selecciona un usuario para darle acceso a esta comunidad.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Cargando usuarios...</span>
              </div>
            ) : availableUsers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay mas usuarios disponibles para agregar.
              </p>
            ) : (
              <Select
                value={selectedUserId ?? "none"}
                onValueChange={(val) => setSelectedUserId(val === "none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Seleccionar usuario...</SelectItem>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({getRoleLabel(u.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGrant}
              disabled={!selectedUserId || isGranting}
            >
              {isGranting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Otorgando...
                </>
              ) : (
                "Otorgar acceso"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={revokeTarget !== null} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revocar acceso</DialogTitle>
            <DialogDescription>
              ¿Revocar el acceso de{' '}
              <strong>{revokeTarget?.full_name || revokeTarget?.email}</strong> a
              esta comunidad?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRevokeTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? 'Revocando...' : 'Revocar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
