"use client";

import { useState } from "react";
import { LogOut, User as UserIcon, ChevronsUpDown, Download, ArrowUpCircle, ToggleLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { routes } from "@/lib/routes";
import { createClient } from "@/utils/supabase/client";
import { useAppVersion, DOWNLOAD_URL } from "@/hooks/useAppVersion";
import { FeatureFlagsDialog } from "@/components/ui/FeatureFlagsDialog";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

function getInitials(email?: string) {
  if (!email) return "U";
  const [name] = email.split("@");
  const parts = name.split(/[._-]/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return (
    (parts[0][0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase()
  );
}

export function NavUser({
  userName,
  userEmail,
}: {
  userName?: string;
  userEmail?: string;
}) {
  const { isMobile } = useSidebar();
  const { showDownload, hasUpdate, latestVersion, currentVersion } = useAppVersion();
  const [featureFlagsOpen, setFeatureFlagsOpen] = useState(false);
  const { availableFlags } = useFeatureFlags();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-[#E8EDF5] text-[#1B3A6F] font-bold">
                    {getInitials(userEmail)}
                  </AvatarFallback>
                </Avatar>
                {hasUpdate && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-white" />
                  </span>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {userName || "Usuario"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-[#E8EDF5] text-[#1B3A6F] font-bold">
                    {getInitials(userEmail)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {userName || "Usuario"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {userEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={routes.cuenta}>
                  <UserIcon />
                  Mi Perfil
                </Link>
              </DropdownMenuItem>
              {availableFlags.length > 0 && (
                <DropdownMenuItem onClick={() => setFeatureFlagsOpen(true)}>
                  <ToggleLeft />
                  Funcionalidades
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            {showDownload && (
              <>
                <DropdownMenuSeparator />
                {hasUpdate ? (
                  <DropdownMenuItem asChild>
                    <a
                      href={DOWNLOAD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-amber-700 focus:text-amber-700 focus:bg-amber-50"
                    >
                      <ArrowUpCircle className="h-4 w-4 text-amber-600" />
                      <div className="flex flex-col">
                        <span className="font-medium">Actualizar a {latestVersion}</span>
                        <span className="text-xs text-amber-600">Actual: {currentVersion}</span>
                      </div>
                    </a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <a
                      href={DOWNLOAD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download />
                      Descargar app de escritorio
                    </a>
                  </DropdownMenuItem>
                )}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                const supabase = createClient();
                try {
                  await Promise.race([
                    supabase.auth.signOut(),
                    new Promise((r) => setTimeout(r, 1000)),
                  ]);
                } catch {}
                window.location.reload();
              }}
            >
              <LogOut />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <FeatureFlagsDialog open={featureFlagsOpen} onOpenChange={setFeatureFlagsOpen} />
    </SidebarMenu>
  );
}
