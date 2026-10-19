"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  ArrowLeft,
  Moon,
  Sun,
  LogOut,
  ExternalLink,
  Shield,
  Activity,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isSuperAdmin = user?.role === "superadmin";

  // Vérification de sécurité côté client : réservé exclusivement au Super Utilisateur
  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?redirect=/admin");
      } else if (!isSuperAdmin) {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, isSuperAdmin, router]);

  if (isLoading || !user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-sm font-medium">
            Vérification des droits d&apos;administration exclusifs...
          </span>
        </div>
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";
  const displayName = profile?.fullName || user.email.split("@")[0];
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "AD";

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-950 font-sans text-foreground antialiased flex flex-col">
      {/* 1. Header supérieur du portail Administrateur */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E8E4DC] dark:border-slate-800 bg-[#FAF8F5]/90 dark:bg-slate-900/90 px-4 sm:px-6 backdrop-blur-md">
        {/* Logo & Badge d'Administration */}
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 group"
            title="EduFlow - Console d'Administration"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <img
                src="/logo.png"
                alt="EduFlow Logo"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  EduFlow
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30">
                  <ShieldCheck className="h-3 w-3" />
                  Super Admin
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Supervision Globale &amp; Gestion
              </span>
            </div>
          </Link>

          {/* Séparateur vertical */}
          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Navigation interne du portail Admin */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/admin"
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5",
                pathname === "/admin" || pathname === "/admin/users"
                  ? "bg-slate-900 text-white dark:bg-slate-800 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Gestion des Utilisateurs</span>
            </Link>
          </nav>
        </div>

        {/* Côté droit : Accès Espace Étudiant + Thème + Profil Admin */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Raccourci vers l'application étudiante */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E8E4DC] dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs transition-colors"
            title="Revenir au tableau de bord étudiant"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Espace Étudiant</span>
          </Link>

          {/* Bascule de thème */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg"
              aria-label="Basculer le thème"
              title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {isDark ? (
                <Moon className="h-4 w-4 text-amber-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </Button>
          )}

          {/* Menu Profil Administrateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-lg p-0.5 outline-none ring-2 ring-transparent transition hover:ring-slate-400/30 focus-visible:ring-slate-500 cursor-pointer"
                aria-label="Menu administrateur"
              >
                <Avatar className="h-8 w-8 ring-1 ring-[#E8E4DC] dark:ring-slate-700">
                  {profile?.avatarUrl && (
                    <AvatarImage src={profile.avatarUrl} alt={displayName} />
                  )}
                  <AvatarFallback className="bg-slate-900 text-xs font-semibold text-amber-400 dark:bg-slate-800">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-100 truncate">
                      {displayName}
                    </p>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-xs leading-none text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard"
                  className="cursor-pointer gap-2 text-slate-700 dark:text-slate-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Aller à l&apos;Espace Étudiant</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 2. Zone de contenu principale de l'administration */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {children}
      </main>

      {/* 3. Pied de page discret */}
      <footer className="border-t border-[#E8E4DC] dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50">
        <p>
          EduFlow Administration Portal • Système certifié de gestion des comptes et privilèges académiques.
        </p>
      </footer>
    </div>
  );
}
