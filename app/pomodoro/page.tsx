"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Flame,
  CheckCircle2,
  Coffee,
  Sparkles,
  History,
  Timer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  usePomodoroTimer,
  formatClock,
} from "@/hooks/use-pomodoro"
import {
  POMODORO_LABELS,
} from "@/lib/store/pomodoro-store"
import type { PomodoroType } from "@/types/database"

export default function PomodoroPage() {
  const {
    mode,
    status,
    remaining,
    progress,
    cycleCount,
    sessions,
    soundEnabled,
    start,
    pause,
    reset,
    switchMode,
    setSoundEnabled,
  } = usePomodoroTimer()

  // Keyboard shortcut: Space toggles start/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.code === "Space") {
        e.preventDefault()
        if (status === "running") {
          pause()
        } else {
          start()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [status, start, pause])

  const modes: { key: PomodoroType; label: string; icon: typeof Flame }[] = [
    { key: "work", label: "Concentration", icon: Flame },
    { key: "short_break", label: "Pause courte", icon: Coffee },
    { key: "long_break", label: "Pause longue", icon: Sparkles },
  ]

  // Calculate current cycle progress (1 to 4)
  const currentCycleDot = cycleCount % 4

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Minuteur Pomodoro
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Améliore ta rétention avec la technique Pomodoro : 25 min d&apos;étude, 5 min de pause.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="rounded-xl gap-2 self-start sm:self-auto"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="size-4 text-primary" /> Son activé
            </>
          ) : (
            <>
              <VolumeX className="size-4 text-muted-foreground" /> Son désactivé
            </>
          )}
        </Button>
      </div>

      {/* Main Timer Display Card */}
      <Card className="relative overflow-hidden rounded-3xl border-border/80 bg-gradient-to-b from-card via-card to-primary/5 p-6 shadow-lg shadow-black/5 backdrop-blur-2xl sm:p-10">
        {/* Mode Selector Tabs */}
        <div className="mx-auto flex max-w-md items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-background/60 p-1.5 backdrop-blur-md">
          {modes.map(({ key, label, icon: Icon }) => {
            const isActive = mode === key
            return (
              <button
                key={key}
                onClick={() => switchMode(key)}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all sm:text-sm ${
                  isActive
                    ? "text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="pomodoro-mode-active"
                    className="absolute inset-0 rounded-xl bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Big Circular Timer */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="relative flex size-64 items-center justify-center sm:size-80">
            {/* SVG Progress Circle */}
            <svg className="size-full -rotate-90 transform" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="88"
                className="stroke-muted/30"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="100"
                cy="100"
                r="88"
                className="stroke-primary transition-all duration-300"
                strokeWidth="10"
                strokeDasharray={552}
                strokeDashoffset={552 * (1 - progress)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-mono text-5xl font-black tracking-tight sm:text-7xl">
                {formatClock(remaining)}
              </span>
              <span className="mt-2 text-sm font-medium text-muted-foreground">
                {POMODORO_LABELS[mode]}
              </span>
              <Badge variant="secondary" className="mt-3 text-xs capitalize">
                {status === "running" ? "En cours..." : status === "paused" ? "Pause" : "En attente"}
              </Badge>
            </div>
          </div>

          {/* Cycle dots indicator */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Cycle :</span>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = idx < currentCycleDot || (currentCycleDot === 0 && cycleCount > 0 && idx === 3)
              return (
                <span
                  key={idx}
                  className={`size-2.5 rounded-full transition-all ${
                    isFilled ? "bg-primary scale-110 shadow-sm shadow-primary/50" : "bg-muted"
                  }`}
                  title={`Session ${idx + 1}/4`}
                />
              )
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3">
          {status === "running" ? (
            <Button
              onClick={pause}
              size="lg"
              className="h-12 rounded-2xl px-8 text-base shadow-lg shadow-primary/20 gap-2"
            >
              <Pause className="size-5" /> Mettre en pause
            </Button>
          ) : (
            <Button
              onClick={start}
              size="lg"
              className="h-12 rounded-2xl px-8 text-base shadow-lg shadow-primary/20 gap-2"
            >
              <Play className="size-5" /> Démarrer la session
            </Button>
          )}

          <Button
            onClick={reset}
            variant="outline"
            size="lg"
            className="h-12 rounded-2xl px-4 text-muted-foreground hover:text-foreground"
            title="Réinitialiser"
          >
            <RotateCcw className="size-5" />
          </Button>

          <Button
            onClick={() => {
              reset()
              if (mode === "work") switchMode("short_break")
              else switchMode("work")
            }}
            variant="ghost"
            size="lg"
            className="h-12 rounded-2xl px-4 text-muted-foreground hover:text-foreground"
            title="Passer au mode suivant"
          >
            <SkipForward className="size-5" />
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Astuce : appuie sur la touche <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Espace</kbd> pour démarrer ou suspendre.
        </p>
      </Card>

      {/* History & Statistics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Cycles and Total Duration */}
        <Card className="rounded-2xl border-border/80 bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Timer className="size-4 text-primary" /> Statistiques de concentration
            </CardTitle>
            <CardDescription>Ton rythme de travail aujourd&apos;hui</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
                <span className="text-xs text-muted-foreground">Sessions validées</span>
                <p className="mt-1 text-2xl font-bold">{sessions.length}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
                <span className="text-xs text-muted-foreground">Cycles complets</span>
                <p className="mt-1 text-2xl font-bold">{Math.floor(cycleCount / 4)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Temps total focalisé</span>
                <span className="font-mono text-sm font-bold text-primary">
                  {sessions.reduce((acc, s) => acc + s.duration_minutes, 0)} minutes
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions List */}
        <Card className="rounded-2xl border-border/80 bg-card/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="size-4 text-brand-2" /> Historique récent
            </CardTitle>
            <CardDescription>Dernières sessions enregistrées</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Aucune session enregistrée pour le moment. Lance ton premier minuteur !
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {sessions.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-success" />
                      <span className="font-medium">{POMODORO_LABELS[s.type]}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-muted-foreground">
                      <span>{s.duration_minutes} min</span>
                      <span>•</span>
                      <span>
                        {new Date(s.completed_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
