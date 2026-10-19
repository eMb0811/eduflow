"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export interface PomodoroSessionData {
  isActive: boolean;
  isRunning: boolean;
  mode: "work" | "shortBreak";
  timeLeft: number;
  durationMinutes: number;
  subjectName: string | null;
  documentTitle: string | null;
  documentId: string | null;
  targetEndTime: number | null; // Timestamp en millisecondes pour résister aux navigations
}

interface PomodoroContextType extends PomodoroSessionData {
  startPomodoro: (params: {
    subjectName: string;
    documentTitle?: string;
    documentId?: string;
    durationMinutes?: number;
    autoStart?: boolean;
  }) => void;
  pausePomodoro: () => void;
  resumePomodoro: () => void;
  resetPomodoro: () => void;
  completePomodoro: () => Promise<void>;
  switchMode: (mode: "work" | "shortBreak") => void;
}

const PomodoroContext = React.createContext<PomodoroContextType | null>(null);

const STORAGE_KEY = "eduflow_active_pomodoro";

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [state, setState] = React.useState<PomodoroSessionData>({
    isActive: false,
    isRunning: false,
    mode: "work",
    timeLeft: 25 * 60,
    durationMinutes: 25,
    subjectName: null,
    documentTitle: null,
    documentId: null,
    targetEndTime: null,
  });

  // Sons de fin de Pomodoro via Web Audio API
  const playBeep = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      console.warn("AudioContext non disponible :", e);
    }
  }, []);

  // 1. Restauration depuis localStorage au montage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isActive) {
          let calculatedTimeLeft = parsed.timeLeft;
          let stillRunning = parsed.isRunning;

          // Si le timer tournait, recalculer le temps restant réel selon targetEndTime
          if (parsed.isRunning && parsed.targetEndTime) {
            const diffSeconds = Math.round((parsed.targetEndTime - Date.now()) / 1000);
            if (diffSeconds > 0) {
              calculatedTimeLeft = diffSeconds;
            } else {
              calculatedTimeLeft = 0;
              stillRunning = false;
            }
          }

          setState({
            ...parsed,
            timeLeft: Math.max(0, calculatedTimeLeft),
            isRunning: stillRunning,
          });
        }
      }
    } catch (err) {
      console.warn("Erreur lecture localStorage Pomodoro :", err);
    }
  }, []);

  // 2. Sauvegarde dans localStorage à chaque changement d'état
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (state.isActive) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn("Erreur écriture localStorage Pomodoro :", err);
    }
  }, [state]);

  // 3. Tick effect du minuteur (continue de tourner partout dans l'application)
  React.useEffect(() => {
    let timer: NodeJS.Timeout;

    if (state.isRunning) {
      timer = setInterval(() => {
        setState((prev) => {
          if (!prev.isRunning) return prev;

          let newTime = prev.timeLeft - 1;
          if (prev.targetEndTime) {
            const diff = Math.round((prev.targetEndTime - Date.now()) / 1000);
            newTime = Math.max(0, diff);
          }

          if (newTime <= 0) {
            playBeep();

            // Enregistrer automatiquement la session terminée dans MySQL
            if (prev.mode === "work" && prev.subjectName) {
              fetch("/api/pomodoro", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  duration_minutes: prev.durationMinutes || 25,
                  type: "study",
                  notes: `[Focus Révision] ${prev.subjectName}${
                    prev.documentTitle ? ` — ${prev.documentTitle}` : ""
                  }`,
                }),
              }).catch(() => {});
            }

            return {
              ...prev,
              isRunning: false,
              timeLeft: 0,
              targetEndTime: null,
            };
          }

          return {
            ...prev,
            timeLeft: newTime,
          };
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [state.isRunning, playBeep]);

  // Démarrer une nouvelle session Pomodoro de révision
  const startPomodoro = React.useCallback(
    (params: {
      subjectName: string;
      documentTitle?: string;
      documentId?: string;
      durationMinutes?: number;
      autoStart?: boolean;
    }) => {
      const dur = params.durationMinutes || 25;
      const totalSeconds = dur * 60;
      const autoStart = params.autoStart !== false;

      setState({
        isActive: true,
        isRunning: autoStart,
        mode: "work",
        timeLeft: totalSeconds,
        durationMinutes: dur,
        subjectName: params.subjectName,
        documentTitle: params.documentTitle || null,
        documentId: params.documentId || null,
        targetEndTime: autoStart ? Date.now() + totalSeconds * 1000 : null,
      });
    },
    []
  );

  const pausePomodoro = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      targetEndTime: null,
    }));
  }, []);

  const resumePomodoro = React.useCallback(() => {
    setState((prev) => {
      if (prev.timeLeft <= 0) return prev;
      return {
        ...prev,
        isRunning: true,
        targetEndTime: Date.now() + prev.timeLeft * 1000,
      };
    });
  }, []);

  const resetPomodoro = React.useCallback(() => {
    setState((prev) => {
      const totalSec = (prev.mode === "work" ? prev.durationMinutes : 5) * 60;
      return {
        ...prev,
        isRunning: false,
        timeLeft: totalSec,
        targetEndTime: null,
      };
    });
  }, []);

  const switchMode = React.useCallback((mode: "work" | "shortBreak") => {
    const totalSec = (mode === "work" ? 25 : 5) * 60;
    setState((prev) => ({
      ...prev,
      mode,
      durationMinutes: mode === "work" ? 25 : 5,
      isRunning: false,
      timeLeft: totalSec,
      targetEndTime: null,
    }));
  }, []);

  const completePomodoro = React.useCallback(async () => {
    if (state.subjectName) {
      await fetch("/api/pomodoro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_minutes: state.durationMinutes || 25,
          type: "study",
          notes: `[Focus Validé] ${state.subjectName}${
            state.documentTitle ? ` — ${state.documentTitle}` : ""
          }`,
        }),
      }).catch(() => {});
    }

    setState({
      isActive: false,
      isRunning: false,
      mode: "work",
      timeLeft: 25 * 60,
      durationMinutes: 25,
      subjectName: null,
      documentTitle: null,
      documentId: null,
      targetEndTime: null,
    });
  }, [state.subjectName, state.documentTitle, state.durationMinutes]);

  const value = React.useMemo(
    () => ({
      ...state,
      startPomodoro,
      pausePomodoro,
      resumePomodoro,
      resetPomodoro,
      completePomodoro,
      switchMode,
    }),
    [
      state,
      startPomodoro,
      pausePomodoro,
      resumePomodoro,
      resetPomodoro,
      completePomodoro,
      switchMode,
    ]
  );

  return (
    <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = React.useContext(PomodoroContext);
  if (!ctx) {
    throw new Error("usePomodoro must be used within a PomodoroProvider");
  }
  return ctx;
}
