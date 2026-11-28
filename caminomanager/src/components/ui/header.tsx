"use client";
import { Moon, Sun, User as UserIcon, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { routes } from "@/lib/routes";
import { signOut } from "@/lib/signOut";
import { WindowControls } from "@/components/electron/WindowControls";

interface HeaderProps {
  userEmail?: string;
  userName?: string;
  title?: string;
}


function getInitials(email?: string) {
  if (!email) return "U";
  const [name] = email.split("@");
  const parts = name.split(/[._-]/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return (
    (parts[0][0] || "").toUpperCase() + (parts[1]?.[0] || "").toUpperCase()
  );
}

export default function Header({ userEmail, userName, title: _title }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Toggle dark mode (add/remove 'dark' class on html)
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        document.documentElement.classList.toggle("dark", next);
      }
      return next;
    });
  };

  // Cerrar el menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header
      className="bg-background shadow-sm border-b h-16 flex items-center px-4 justify-between"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
      </div>
      <div className="flex items-center space-x-4 relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2 rounded-full px-1 py-1 cursor-pointer focus:outline-none hover:bg-accent transition-colors"
              aria-label="Abrir menú de usuario"
            >
              {userName && (
                <span className="text-sm text-foreground font-medium pl-2 hidden sm:inline">
                  {userName}
                </span>
              )}
              <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-primary/30 bg-primary/10">
                <span className="font-bold text-lg text-primary">
                  {getInitials(userEmail)}
                </span>
              </div>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end" sideOffset={8} className="min-w-[200px] rounded-lg bg-popover text-popover-foreground p-2 shadow-lg border z-50">
            <DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted-foreground font-semibold">Cuenta</DropdownMenu.Label>
            <DropdownMenu.Item asChild>
              <Link
                href={routes.cuenta}
                className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer hover:bg-accent"
                onClick={() => setMenuOpen(false)}
              >
                <UserIcon className="w-4 h-4" />
                Mi Perfil
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-2 h-px bg-border" />
            <DropdownMenu.Item asChild>
              <button
                className="flex items-center gap-2 w-full px-2 py-2 rounded-md cursor-pointer hover:bg-accent"
                onClick={() => {
                  toggleDarkMode();
                  setMenuOpen(false);
                }}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <span className="flex-1">Dark Mode</span>
                <span className="ml-auto">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    readOnly
                    className="accent-blue-800"
                  />
                </span>
              </button>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-2 h-px bg-border" />
            <DropdownMenu.Item asChild>
              <button
                type="button"
                className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                onClick={async () => {
                  setMenuOpen(false);
                  await signOut();
                }}
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <WindowControls />
      </div>
    </header>
  );
}
