"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  BookOpen,
  Timer,
  Moon,
  Sun,
  Pin,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { KoccIcon } from "@/components/icons/kocc-icon";

/**
 * Liens de navigation principaux de l'application EduFlow
 */
export const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Planning & Emploi du temps",
    href: "/planning",
    icon: Calendar,
  },
  {
    title: "Espace Étude & Révisions",
    href: "/courses",
    icon: BookOpen,
  },
  {
    title: "Assistant Kocc",
    href: "/chat",
    icon: KoccIcon,
  },
];

interface SidebarProps {
  /** État d'ouverture pour la version mobile (Sheet) */
  open?: boolean;
  /** Callback lors du changement d'état mobile */
  onOpenChange?: (open: boolean) => void;
  /** Classes CSS supplémentaires */
  className?: string;
}

/**
 * Composant de bascule de thème sombre/clair
 */
function ThemeToggle({ isCollapsed }: { isCollapsed?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse", isCollapsed ? "w-10 mx-auto" : "w-full")} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors",
        isCollapsed
          ? "w-10 h-10 p-0 mx-auto flex items-center justify-center rounded-lg"
          : "w-full justify-between px-3 py-2"
      )}
      aria-label="Basculer le thème"
      title={isDark ? "Basculer en mode clair" : "Basculer en mode sombre"}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        {isDark ? (
          <Moon className="h-4 w-4 text-amber-400 shrink-0" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500 shrink-0" />
        )}
        {!isCollapsed && <span>{isDark ? "Mode sombre" : "Mode clair"}</span>}
      </span>
      {!isCollapsed && (
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {isDark ? "Nuit" : "Jour"}
        </span>
      )}
    </Button>
  );
}

/**
 * Contenu interne de la Sidebar (adaptable mode rail ou tiroir complet)
 */
function SidebarContent({
  isCollapsed = false,
  onNavigate,
  isPinned,
  onTogglePin,
  onClose,
}: {
  isCollapsed?: boolean;
  onNavigate?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className={cn("flex h-full flex-col justify-between transition-all duration-300", isCollapsed ? "p-2" : "p-4")}>
      <div className="space-y-6">
        {/* Logo EduFlow fait sur Canva */}
        <div className={cn("flex items-center transition-all duration-300", isCollapsed ? "justify-center py-2" : "justify-between px-2 py-2")}>
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-3 group min-w-0"
            title="EduFlow - Tableau de bord"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <img
                src="/logo.png"
                alt="EduFlow Logo"
                className="h-full w-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate block">
                  EduFlow
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Organisation & Études
                </p>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <div className="flex items-center gap-1 animate-in fade-in duration-200">
              {onTogglePin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onTogglePin}
                  className={cn(
                    "h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hidden md:flex",
                    isPinned && "text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15"
                  )}
                  title={isPinned ? "Désépingler la barre latérale" : "Épingler la barre latérale"}
                >
                  <Pin className="h-4 w-4" />
                </Button>
              )}
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 md:hidden"
                  aria-label="Fermer la navigation"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Liens de navigation */}
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/planning" &&
                (pathname.startsWith("/planning") ||
                  pathname.startsWith("/schedule") ||
                  pathname.startsWith("/pomodoro"))) ||
              (item.href !== "/dashboard" &&
                item.href !== "/planning" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={isCollapsed ? item.title : undefined}
                className={cn(
                  "group flex items-center rounded-lg border border-transparent transition-all duration-200",
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5 text-sm font-medium",
                  isActive
                    ? "bg-slate-900 text-white border-slate-700/80 ring-1 ring-inset ring-amber-400/25 shadow-sm dark:bg-slate-800/95 dark:text-white dark:border-slate-700"
                    : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 hover:border-slate-200/80 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100 dark:hover:border-slate-700/60"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                    isActive
                      ? "text-amber-400"
                      : "text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200"
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.title}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </>
                )}
              </Link>
            );
          })}

          {user?.role === "superadmin" && (
            <div className="pt-2 border-t border-[#E8E4DC]/60 dark:border-slate-800/60 mt-2">
              <Link
                href="/admin"
                onClick={onNavigate}
                title={isCollapsed ? "Administration" : undefined}
                className={cn(
                  "group flex items-center rounded-lg border border-transparent transition-all duration-200",
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5 text-sm font-semibold",
                  pathname.startsWith("/admin")
                    ? "bg-slate-900 text-white border-slate-700/80 ring-1 ring-inset ring-amber-400/25 shadow-sm dark:bg-slate-800/95 dark:text-white dark:border-slate-700"
                    : "text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-900 dark:hover:text-amber-300 hover:border-amber-500/20"
                )}
              >
                <ShieldCheck
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                    pathname.startsWith("/admin")
                      ? "text-amber-400"
                      : "text-slate-500 dark:text-slate-400 group-hover:text-amber-500"
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="truncate">Administration</span>
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                      Super Admin
                    </span>
                  </>
                )}
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Pied de sidebar */}
      <div className={cn("border-t border-[#E8E4DC] pt-3 dark:border-slate-800 space-y-2", isCollapsed ? "text-center" : "")}>
        <ThemeToggle isCollapsed={isCollapsed} />
        {!isCollapsed && (
          <div className="px-2 pt-1 text-center space-y-1 animate-in fade-in duration-200">
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <Link href="/privacy" onClick={onNavigate} className="hover:underline">
                Confidentialité
              </Link>
              <span>•</span>
              <Link href="/terms" onClick={onNavigate} className="hover:underline">
                CGU
              </Link>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              EduFlow v1.0 • Tous droits réservés
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Composant Sidebar exporté
 * - Au repos : Barre rail compacte (w-16) où toutes les icônes restent toujours visibles.
 * - Au survol (ou épinglée) : S'étend en tiroir complet (w-[260px]) révélant les textes et le logo.
 */
export function Sidebar({ open = false, onOpenChange, className }: SidebarProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPinned, setIsPinned] = React.useState(false);

  const isExpanded = isHovered || isPinned || open;

  return (
    <>
      {/* Desktop Navigation Rail & Drawer qui s'étend au survol */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-[#E8E4DC] bg-[#FAF8F5]/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-all duration-300 ease-in-out",
          isExpanded ? "w-[260px] shadow-2xl" : "w-16 shadow-xs",
          className
        )}
      >
        <SidebarContent
          isCollapsed={!isExpanded}
          isPinned={isPinned}
          onTogglePin={() => setIsPinned(!isPinned)}
          onNavigate={() => {
            if (!isPinned) {
              setIsHovered(false);
              onOpenChange?.(false);
            }
          }}
        />
      </aside>

      {/* Fond d'atténuation discret si survolé temporairement (non épinglé) */}
      {isExpanded && !isPinned && (
        <div
          onClick={() => {
            setIsHovered(false);
            onOpenChange?.(false);
          }}
          className="hidden md:block fixed inset-0 bg-slate-900/10 backdrop-blur-2xs z-30 transition-opacity"
        />
      )}

      {/* Sidebar Mobile avec Sheet (drawer natif) */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[280px] p-0 border-r border-[#E8E4DC] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-900">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation EduFlow</SheetTitle>
          </SheetHeader>
          <SidebarContent
            isCollapsed={false}
            onNavigate={() => onOpenChange?.(false)}
            onClose={() => onOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
