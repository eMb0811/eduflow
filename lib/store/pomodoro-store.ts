import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { PomodoroType } from "@/types/database"

export type PomodoroStatus = "idle" | "running" | "paused"

export interface PomodoroDurations {
  work: number
  short_break: number
  long_break: number
}

/** Session completed locally; to be synced with the backend once the endpoint exists. */
export interface LocalPomodoroSession {
  id: string
  type: PomodoroType
  duration_minutes: number
  completed_at: string
}

interface PomodoroState {
  mode: PomodoroType
  status: PomodoroStatus
  /** Epoch ms at which the running phase ends (only when running). */
  endsAt: number | null
  /** Remaining ms when idle or paused. */
  remainingMs: number
  durations: PomodoroDurations
  /** Work sessions completed in the current cycle (long break every 4). */
  cycleCount: number
  sessions: LocalPomodoroSession[]
  soundEnabled: boolean

  start: () => void
  pause: () => void
  reset: () => void
  switchMode: (mode: PomodoroType) => void
  /** Called by the ticker when the phase reaches zero. Idempotent. Returns the finished session, if any. */
  complete: () => LocalPomodoroSession | null
  setSoundEnabled: (enabled: boolean) => void
  setDurations: (durations: Partial<PomodoroDurations>) => void
}

export const DEFAULT_DURATIONS: PomodoroDurations = { work: 25, short_break: 5, long_break: 15 }
const LONG_BREAK_EVERY = 4

const toMs = (minutes: number) => minutes * 60_000

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      mode: "work",
      status: "idle",
      endsAt: null,
      remainingMs: toMs(DEFAULT_DURATIONS.work),
      durations: DEFAULT_DURATIONS,
      cycleCount: 0,
      sessions: [],
      soundEnabled: true,

      start: () => {
        const { status, remainingMs } = get()
        if (status === "running") return
        set({ status: "running", endsAt: Date.now() + remainingMs })
      },

      pause: () => {
        const { status, endsAt } = get()
        if (status !== "running" || endsAt === null) return
        set({ status: "paused", endsAt: null, remainingMs: Math.max(0, endsAt - Date.now()) })
      },

      reset: () => {
        const { mode, durations } = get()
        set({ status: "idle", endsAt: null, remainingMs: toMs(durations[mode]) })
      },

      switchMode: (mode) => {
        const { durations } = get()
        set({ mode, status: "idle", endsAt: null, remainingMs: toMs(durations[mode]) })
      },

      complete: () => {
        const { status, endsAt, mode, durations, cycleCount, sessions } = get()
        if (status !== "running" || endsAt === null || Date.now() < endsAt) return null

        const session: LocalPomodoroSession = {
          id: crypto.randomUUID(),
          type: mode,
          duration_minutes: durations[mode],
          completed_at: new Date().toISOString(),
        }

        let nextMode: PomodoroType = "work"
        let nextCycle = cycleCount
        if (mode === "work") {
          nextCycle = cycleCount + 1
          nextMode = nextCycle % LONG_BREAK_EVERY === 0 ? "long_break" : "short_break"
        }

        set({
          mode: nextMode,
          status: "idle",
          endsAt: null,
          remainingMs: toMs(durations[nextMode]),
          cycleCount: nextCycle,
          sessions: [session, ...sessions].slice(0, 200),
        })
        return session
      },

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      setDurations: (partial) => {
        const durations = { ...get().durations, ...partial }
        const { mode, status } = get()
        set(
          status === "idle"
            ? { durations, remainingMs: toMs(durations[mode]) }
            : { durations }
        )
      },
    }),
    {
      name: "eduflow-pomodoro",
      storage: createJSONStorage(() => localStorage),
      // Rehydrated manually after mount (see components/providers.tsx).
      skipHydration: true,
      partialize: ({ mode, status, endsAt, remainingMs, durations, cycleCount, sessions, soundEnabled }) => ({
        mode,
        status,
        endsAt,
        remainingMs,
        durations,
        cycleCount,
        sessions,
        soundEnabled,
      }),
    }
  )
)

export const POMODORO_LABELS: Record<PomodoroType, string> = {
  work: "Concentration",
  short_break: "Pause courte",
  long_break: "Pause longue",
}
