'use client';

import { AppSidebar } from "@/components/ui/app-sidebar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { WindowControls } from "@/components/electron/WindowControls";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { QueryProvider } from "@/app/QueryProvider";
import { Spinner } from "@/components/ui/spinner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return null; // AuthProvider handles redirect
  }

  return (
    <QueryProvider>
      <SidebarProvider>
        <AppSidebar
          userName={profile?.full_name ?? undefined}
          userEmail={user.email}
          className="print-hidden"
        />
        <SidebarInset className="min-w-0">
          <header
            className="sticky top-0 z-50 bg-card/90 backdrop-blur flex h-16 shrink-0 items-center gap-2 border-b px-4 print-hidden"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumbs />
            </div>
            <div className="ml-auto" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <WindowControls />
            </div>
          </header>
          <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6 print:p-0 print:overflow-visible">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </QueryProvider>
  );
}
