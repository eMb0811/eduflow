"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-context";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";
import { usePomodoro } from "@/components/pomodoro/pomodoro-context";
import { useRouter } from "next/navigation";

function formatChrono(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface HeaderProps {
  /** Callback pour déclencher l'ouverture de la sidebar sur mobile */
  onToggleSidebar?: () => void;
}

/**
 * Mapping des chemins vers des titres de pages lisibles
 */
const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": {
    title: "Tableau de bord",
    subtitle: "Vue d'ensemble de vos révisions et cours",
  },
  "/schedule": {
    title: "Emploi du Temps",
    subtitle: "Synchronisé automatiquement avec votre planning de révision",
  },
  "/planning": {
    title: "Planning & Emploi du temps",
    subtitle: "Calendrier unifié de vos cours universitaires et créneaux de révision",
  },
  "/chat": {
    title: "Kocc",
    subtitle: "Tuteur IA académique propulsé par Gemini 3.8 Flash",
  },
  "/courses": {
    title: "Espace Étude & Révisions",
    subtitle: "Supports académiques, fiches de synthèse, flashcards, quiz et focus Pomodoro",
  },
  "/pomodoro": {
    title: "Focus Pomodoro",
    subtitle: "Cycles de concentration chronométrés",
  },
};

export function Header({ onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();
  const { isActive, isRunning, timeLeft, subjectName } = usePomodoro();

  const displayName =
    profile?.fullName || user?.email?.split("@")[0] || "Étudiant";
  const displayEmail = user?.email || "etudiant@eduflow.app";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "ED";

  const pageInfo = PAGE_TITLES[pathname] || {
    title: "EduFlow",
    subtitle: "Plateforme d'apprentissage académique",
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-[#E8E4DC] bg-[#FAF8F5]/90 px-3 sm:px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 md:px-6">
      {/* Côté gauche : Bouton tiroir (mobile) + Logo compact (mobile) + Titre dynamique */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 shrink-0 md:hidden"
          aria-label="Ouvrir le tiroir de navigation"
          title="Ouvrir la navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xs shrink-0 md:hidden">
            <img
              src="/logo.png"
              alt="EduFlow Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
              {pageInfo.title}
            </h1>
            {pageInfo.subtitle && (
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block truncate">
                {pageInfo.subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Côté droit : Indicateur Pomodoro + Notifications + Avatar */}
      <div className="flex items-center gap-2.5">
        {isActive && (
          <div
            onClick={() => {
              if (subjectName) {
                router.push(`/courses?subject=${encodeURIComponent(subjectName)}&open=1`);
              }
            }}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/35 text-amber-950 dark:text-amber-200 text-xs font-semibold hover:bg-amber-500/20 active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
            title="Ouvrir la session de révision active"
          >
            <span className="relative flex h-2 w-2">
              {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="font-mono font-bold tracking-tight text-amber-900 dark:text-amber-300">
              {formatChrono(timeLeft)}
            </span>
            {subjectName && <span className="truncate max-w-[120px] lg:max-w-[180px]">• {subjectName}</span>}
          </div>
        )}

        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg p-0.5 outline-none ring-2 ring-transparent transition hover:ring-slate-400/30 focus-visible:ring-slate-500 cursor-pointer"
              aria-label="Menu utilisateur"
            >
              <Avatar className="h-8 w-8 cursor-pointer ring-1 ring-slate-200 dark:ring-slate-700">
                {profile?.avatarUrl && (
                  <AvatarImage src={profile.avatarUrl} alt={displayName} />
                )}
                <AvatarFallback className="bg-slate-900 text-xs font-semibold text-white dark:bg-slate-800">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-100 truncate">
                  {displayName}
                </p>
                <p className="text-xs leading-none text-slate-500 dark:text-slate-400 truncate">
                  {displayEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === "superadmin" && (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    href="/admin"
                    className="cursor-pointer gap-2 font-medium text-amber-900 dark:text-amber-300 focus:bg-amber-500/10 focus:text-amber-950 dark:focus:text-amber-200"
                  >
                    <ShieldCheck className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <span>Console d&apos;Administration</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
  );
}
