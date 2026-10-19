"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  BookOpen,
  Timer,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KoccIcon } from "@/components/icons/kocc-icon";

/**
 * Liens principaux pour la navigation inférieure mobile (Bottom Navigation Bar)
 * Optimisée pour une ergonomie à une main sur smartphone et tablette portrait.
 */
const BOTTOM_NAV_ITEMS = [
  {
    title: "Accueil",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Planning",
    href: "/planning",
    icon: Calendar,
  },
  {
    title: "Cours",
    href: "/courses",
    icon: BookOpen,
  },
  {
    title: "Kocc",
    href: "/chat",
    icon: KoccIcon,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-[#E8E4DC] bg-[#FAF8F5]/95 backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95 shadow-[0_-4px_20px_rgba(30,26,20,0.04)] pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-transform duration-200"
    >
      <div className="grid grid-cols-4 items-center px-2 pt-1.5 pb-1">
        {BOTTOM_NAV_ITEMS.map((item) => {
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
              className={cn(
                "group relative flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all duration-150 active:scale-95 touch-manipulation min-h-[48px]",
                isActive
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {/* Liseré indicateur actif subtil en haut */}
              {isActive && (
                <span className="absolute top-0 h-0.5 w-6 rounded-full bg-amber-400 dark:bg-amber-400 animate-in fade-in zoom-in-75 duration-150" />
              )}

              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  isActive
                    ? "text-slate-900 dark:text-white font-bold"
                    : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-150",
                    isActive
                      ? "scale-105 text-amber-500 dark:text-amber-400"
                      : "group-active:scale-95"
                  )}
                />
              </div>

              <span
                className={cn(
                  "text-[10px] tracking-tight leading-none mt-0.5 truncate max-w-full",
                  isActive
                    ? "font-bold text-slate-900 dark:text-white"
                    : "font-medium text-slate-500 dark:text-slate-400"
                )}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
