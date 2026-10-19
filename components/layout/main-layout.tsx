"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { KoccBubble } from "@/components/chat/kocc-bubble";
import { PomodoroProvider } from "@/components/pomodoro/pomodoro-context";
import { PersistentPomodoroBar } from "@/components/pomodoro/persistent-pomodoro-bar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const isFullViewportPage =
    pathname === "/pomodoro" ||
    pathname === "/schedule" ||
    pathname === "/chat";

  return (
    <PomodoroProvider>
      <div
        className={cn(
          "flex bg-[#FAF8F5] dark:bg-slate-950 font-sans text-foreground antialiased",
          isFullViewportPage ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-screen"
        )}
      >
        {/* Sidebar Tiroir au survol ou clic */}
        <Sidebar
          open={mobileSidebarOpen}
          onOpenChange={setMobileSidebarOpen}
        />

        {/* Conteneur principal avec marge pour le rail d'icônes */}
        <div className="flex flex-1 flex-col min-w-0 h-full max-h-full overflow-hidden md:pl-16 transition-all duration-300">
          {/* Header supérieur fixe */}
          <Header onToggleSidebar={() => setMobileSidebarOpen(true)} />

          {/* Zone de contenu principale avec espacement pour la BottomNav sur mobile */}
          <main
            className={cn(
              "flex-1 min-h-0",
              isFullViewportPage
                ? "overflow-hidden px-2 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 flex flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:pb-4"
                : "overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 pb-24 md:pb-8"
            )}
          >
            <div
              className={cn(
                "w-full",
                isFullViewportPage ? "h-full flex-1 flex flex-col min-h-0 overflow-hidden" : "mx-auto max-w-7xl"
              )}
            >
              {children}
            </div>
          </main>
        </div>

        {/* Barre de navigation inférieure mobile (Smartphones & Tablettes) */}
        <BottomNav />

        {/* Barre Pomodoro flottante et persistante durant les révisions */}
        <PersistentPomodoroBar />

        {/* Assistant Kocc sous forme de bulle interactive flottante */}
        <KoccBubble />
      </div>
    </PomodoroProvider>
  );
}
