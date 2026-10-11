"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { usePomodoroStore, POMODORO_LABELS } from "@/lib/store/pomodoro-store"

/** Short three-note chime generated with the Web Audio API (no asset needed). */
function playChime(ctxRef: React.RefObject<AudioContext | null>) {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = ctxRef.current ?? new AudioCtx()
    ctxRef.current = ctx
    const now = ctx.currentTime
    ;[880, 660, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      const t = now + i * 0.22
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch {
    // Audio is a nice-to-have; ignore failures (autoplay policies, etc.).
  }
}

/**
 * Drives the Pomodoro store: ticks while running, completes phases, plays the chime.
 * The interval and audio context are released on unmount.
 */
export function usePomodoroTimer() {
  const state = usePomodoroStore()
  const { status, endsAt, remainingMs, complete, soundEnabled } = state
  const [now, setNow] = useState<number | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (status !== "running" || endsAt === null) return

    const tick = () => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt) {
        const finished = complete()
        if (finished) {
          if (usePomodoroStore.getState().soundEnabled) playChime(audioRef)
          const next = usePomodoroStore.getState().mode
          toast.success(
            finished.type === "work" ? "Session terminée, bravo ! 🎉" : "Pause terminée",
            { description: `Prochaine étape : ${POMODORO_LABELS[next]}.` }
          )
        }
      }
    }

    const timerId = window.setTimeout(tick, 0)
    const intervalId = window.setInterval(tick, 250)
    return () => {
      window.clearTimeout(timerId)
      window.clearInterval(intervalId)
    }
  }, [status, endsAt, complete])

  // Release the audio context when the widget unmounts.
  useEffect(() => {
    return () => {
      void audioRef.current?.close()
      audioRef.current = null
    }
  }, [])

  const remaining =
    status === "running" && endsAt !== null && now !== null
      ? Math.max(0, Math.min(remainingMs, endsAt - now))
      : remainingMs
  const total = state.durations[state.mode] * 60_000
  const progress = total > 0 ? 1 - remaining / total : 0

  return { ...state, remaining, total, progress, soundEnabled }
}

export function formatClock(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
