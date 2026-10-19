"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePomodoro } from "@/components/pomodoro/pomodoro-context";
import { KoccIcon } from "@/components/icons/kocc-icon";
import { cn } from "@/lib/utils";

function formatChrono(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function PersistentPomodoroBar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isActive,
    isRunning,
    timeLeft,
    mode,
    subjectName,
    documentTitle,
    pausePomodoro,
    resumePomodoro,
    resetPomodoro,
    completePomodoro,
  } = usePomodoro();

  const [isMinimized, setIsMinimized] = React.useState(false);

  if (!isActive) return null;

  const isChatPage = pathname === "/chat";
  const isCoursesPage = pathname === "/courses";

  return (
    <div
      className={cn(
        "fixed z-40 transition-all duration-300 ease-in-out",
        "bottom-20 left-4 sm:bottom-6 sm:left-6 max-w-[calc(100vw-2rem)] sm:max-w-md",
        "animate-in fade-in slide-in-from-bottom-5 duration-300"
      )}
    >
      <div className="relative rounded-2xl border border-amber-500/40 bg-slate-950/95 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10 overflow-hidden">
        {/* Barre supérieure d'état */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-gradient-to-r from-amber-500/15 via-transparent to-amber-500/10 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  mode === "work" ? "bg-amber-400" : "bg-emerald-400"
                )}
              />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  {mode === "work" ? "Focus Révision" : "Pause"}
                </span>
                {subjectName && (
                  <span className="text-[11px] font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                    • {subjectName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Chronomètre digital */}
            <span className="font-mono text-sm sm:text-base font-extrabold text-amber-400 tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {formatChrono(timeLeft)}
            </span>

            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isMinimized ? "Agrandir" : "Réduire"}
            >
              {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Corps étendu avec contrôles et passerelles Kocc & Révision */}
        {!isMinimized && (
          <div className="p-3 space-y-2.5">
            {documentTitle && (
              <p className="text-[11px] text-slate-300 truncate">
                Support : <span className="text-white font-medium">{documentTitle}</span>
              </p>
            )}

            {/* Boutons d'action rapide */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Play / Pause */}
              <Button
                type="button"
                size="sm"
                onClick={isRunning ? pausePomodoro : resumePomodoro}
                className={cn(
                  "h-8 px-3 text-xs font-bold gap-1.5 shadow-xs cursor-pointer",
                  isRunning
                    ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                )}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-3.5 w-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Reprendre</span>
                  </>
                )}
              </Button>

              {/* Discuter avec Kocc pendant la révision */}
              {!isChatPage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const target = subjectName
                      ? `/chat?subject=${encodeURIComponent(subjectName)}`
                      : "/chat";
                    router.push(target);
                  }}
                  className="h-8 px-2.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border-white/20 gap-1.5 cursor-pointer"
                  title="Poser une question à Kocc sur ce cours"
                >
                  <KoccIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>Aide Kocc</span>
                </Button>
              )}

              {/* Ouvrir le cours / révision */}
              {!isCoursesPage && subjectName && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push(`/courses?subject=${encodeURIComponent(subjectName)}&open=1`);
                  }}
                  className="h-8 px-2.5 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border-white/20 gap-1.5 cursor-pointer"
                  title="Ouvrir la session de révision complète"
                >
                  <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                  <span>Fiches &amp; Quiz</span>
                </Button>
              )}

              {/* Bouton Terminer */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={completePomodoro}
                className="h-8 px-2 text-[11px] text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 ml-auto gap-1 cursor-pointer"
                title="Valider et terminer cette session Focus"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Terminer</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
