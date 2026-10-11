"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useCurrentDate } from "@/hooks/use-client-time"
import { motion } from "framer-motion"
import {
  CalendarDays,
  Clock,
  Timer,
  BookOpen,
  ArrowRight,
  Flame,
  CheckCircle2,
  CalendarCheck2,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/hooks/use-profile"
import {
  useSchedule,
  useTodayPlanning,
  useRegeneratePlanning,
  useUpcomingExams,
  dayOfWeekFromDate,
  DAYS,
  subjectHue,
  timeToMinutes,
} from "@/hooks/use-schedule"
import { usePomodoroTimer, formatClock } from "@/hooks/use-pomodoro"
import { usePomodoroStats } from "@/hooks/use-pomodoro-stats"

export default function DashboardPage() {
  const today = useCurrentDate()

  const todayKey = useMemo(() => (today ? dayOfWeekFromDate(today) : "monday"), [today])
  const dayLabel = DAYS.find((d) => d.key === todayKey)?.label ?? "Aujourd'hui"

  const formattedDate = useMemo(() => {
    if (!today) return ""
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(today)
  }, [today])

  const { data: profile, isLoading: isProfileLoading } = useProfile()
  const { data: schedule, isLoading: isScheduleLoading } = useSchedule()
  const { data: planning, isLoading: isPlanningLoading } = useTodayPlanning(todayKey)
  const regeneratePlanningMutation = useRegeneratePlanning()
  const { data: exams, isLoading: isExamsLoading } = useUpcomingExams()

  // Pomodoro quick controls
  const { mode, status, remaining, progress, start, pause, reset } = usePomodoroTimer()

  // Filter today's classes and sort by start time
  const todayClasses = useMemo(() => {
    if (!schedule) return []
    return schedule
      .filter((entry) => entry.day_of_week === todayKey)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
  }, [schedule, todayKey])

  const { stats: pomodoroStats, isLoading: isStatsLoading } = usePomodoroStats()

  // Total weekly minutes studied
  const weeklyMinutes = useMemo(() => {
    return pomodoroStats.weekly_study_minutes.reduce((acc, curr) => acc + curr, 0)
  }, [pomodoroStats.weekly_study_minutes])
  const weeklyHours = Math.floor(weeklyMinutes / 60)
  const weeklyRemainingMinutes = weeklyMinutes % 60

  const studentName = profile?.full_name ? profile.full_name.split(" ")[0] : "Étudiant"

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
                <CalendarDays className="size-3.5 text-primary" /> Année académique
              </span>
              <span className="capitalize text-xs text-muted-foreground">{formattedDate}</span>
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              {isProfileLoading ? (
                <Skeleton className="h-9 w-64" />
              ) : (
                <>Bonjour {studentName}</>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile?.field_of_study
                ? `${profile.field_of_study} • Emploi du temps et sessions de travail du jour`
                : "Organisation des cours, planning d'étude et suivi des examens."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button asChild variant="outline" size="sm" className="rounded-md">
              <Link href="/emploi-du-temps">
                <CalendarDays className="size-4" /> Emploi du temps
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-md">
              <Link href="/pomodoro">
                <Timer className="size-4" /> Minuteur de travail
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Étude cette semaine</CardTitle>
            <Clock className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isStatsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>{weeklyHours}h {weeklyRemainingMinutes > 0 ? `${weeklyRemainingMinutes}m` : ""}</>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Flame className="size-3 text-warning" /> En progression constante
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cours du jour ({dayLabel})</CardTitle>
            <BookOpen className="size-4 text-brand-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isScheduleLoading ? <Skeleton className="h-8 w-12" /> : todayClasses.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {todayClasses.length > 0 ? "Prévus dans ton agenda" : "Journée sans cours"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Examens proches</CardTitle>
            <CalendarCheck2 className="size-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isExamsLoading ? <Skeleton className="h-8 w-12" /> : exams?.length ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Échéances à anticiper
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Objectif profil</CardTitle>
            <CheckCircle2 className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {profile?.field_of_study ? "90%" : "50%"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link href="/profil" className="text-primary hover:underline">
                {profile?.field_of_study ? "Profil complet" : "Compléter le profil"}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2 cols): Today's Classes + AI Revision Plan */}
        <div className="space-y-8 lg:col-span-2">
          {/* Today's Classes Card */}
          <Card className="rounded-2xl border-border/80 bg-card/80 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Cours d&apos;aujourd&apos;hui</CardTitle>
                <CardDescription>Ton programme pour ce {dayLabel.toLowerCase()}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="rounded-xl text-xs">
                <Link href="/emploi-du-temps" className="flex items-center gap-1">
                  Voir la semaine <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isScheduleLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : todayClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground mb-3">
                    <CalendarDays className="size-6 text-muted-foreground" />
                  </span>
                  <p className="font-medium text-foreground">Aucun cours aujourd&apos;hui</p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                    Profites-en pour réviser avec tes fiches ou programmer une session de concentration Pomodoro.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayClasses.map((item, index) => {
                    const hue = subjectHue(item.subject)
                    return (
                      <motion.div
                        key={item.id ?? index}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/50 p-3.5 transition-colors hover:border-border hover:bg-background/80"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="size-3 shrink-0 rounded-full shadow-sm"
                            style={{ backgroundColor: `oklch(0.65 0.18 ${hue})` }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-foreground">
                              {item.subject}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {item.room ? `Salle ${item.room}` : "Salle non définie"}
                            </p>
                          </div>
                        </div>

                        <Badge variant="outline" className="font-mono text-xs shrink-0 rounded-lg">
                          {item.start_time} - {item.end_time}
                        </Badge>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revision Plan */}
          <Card className="rounded-xl border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold">Planning de travail recommandé</CardTitle>
                  <Badge variant="outline" className="rounded-md text-[11px] font-normal">
                    Automatisé
                  </Badge>
                </div>
                <CardDescription>
                  Créneaux d&apos;étude calculés selon vos cours et vos examens
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => regeneratePlanningMutation.mutate(todayKey)}
                disabled={regeneratePlanningMutation.isPending || isPlanningLoading}
                className="gap-1.5 text-xs rounded-md"
                title="Régénérer le planning"
              >
                <RotateCcw
                  className={`size-3.5 ${
                    regeneratePlanningMutation.isPending ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">
                  {regeneratePlanningMutation.isPending ? "Génération..." : "Régénérer"}
                </span>
              </Button>
            </CardHeader>
            <CardContent>
              {isPlanningLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : !planning?.slots || planning.slots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Aucun créneau de révision défini pour aujourd&apos;hui.
                </p>
              ) : (
                <div className="space-y-3">
                  {planning.slots.map((slot, idx) => {
                    const isPause = slot.subject.toLowerCase().includes("pause")
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3.5 transition-colors ${
                          isPause
                            ? "border-dashed border-border/80 bg-muted/30"
                            : "border-primary/20 bg-primary/[0.03]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`size-2 rounded-full ${
                                isPause ? "bg-muted-foreground" : "bg-primary"
                              }`}
                            />
                            <span className="text-sm font-semibold truncate text-foreground">
                              {slot.subject}
                            </span>
                          </div>
                          <span className="font-mono text-xs text-muted-foreground shrink-0">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {slot.activity}
                        </p>
                        {slot.tips && (
                          <div className="mt-2 rounded-lg bg-background/80 p-2 text-xs text-primary/90 border border-primary/10">
                            💡 {slot.tips}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 col): Quick Pomodoro & Upcoming Exams */}
        <div className="space-y-8">
          {/* Quick Pomodoro Widget */}
          <Card className="rounded-2xl border-border/80 bg-gradient-to-b from-card to-secondary/30 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Timer className="size-4 text-primary" /> Minuteur Pomodoro
                </CardTitle>
                <Badge variant="outline" className="text-xs capitalize font-medium">
                  {mode === "work" ? "Travail" : mode === "short_break" ? "Pause courte" : "Pause longue"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-2">
              <div className="relative my-2 flex size-36 items-center justify-center">
                <svg className="size-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="stroke-muted/40"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="stroke-primary transition-all duration-300"
                    strokeWidth="6"
                    strokeDasharray={264}
                    strokeDashoffset={264 * (1 - progress)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-bold tracking-tight">
                    {formatClock(remaining)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {status === "running" ? "En cours" : status === "paused" ? "En pause" : "Prêt"}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-3 flex items-center gap-2">
                {status === "running" ? (
                  <Button
                    onClick={pause}
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5"
                  >
                    <Pause className="size-3.5" /> Pause
                  </Button>
                ) : (
                  <Button
                    onClick={start}
                    size="sm"
                    className="rounded-xl gap-1.5 shadow-sm"
                  >
                    <Play className="size-3.5" /> Démarrer
                  </Button>
                )}
                <Button
                  onClick={reset}
                  variant="ghost"
                  size="sm"
                  className="rounded-xl gap-1.5 text-muted-foreground"
                >
                  <RotateCcw className="size-3.5" /> Réinitialiser
                </Button>
              </div>

              <Button asChild variant="link" size="sm" className="mt-4 text-xs text-primary">
                <Link href="/pomodoro">Ouvrir le minuteur plein écran</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Exams Card */}
          <Card className="rounded-2xl border-border/80 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarCheck2 className="size-4 text-chart-4" /> Examens à venir
              </CardTitle>
              <CardDescription>Prépare tes révisions à temps</CardDescription>
            </CardHeader>
            <CardContent>
              {isExamsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : !exams || exams.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Aucun examen programmé.
                </p>
              ) : (
                <div className="space-y-3">
                  {exams.map((exam) => {
                    const daysLeft = today
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(exam.exam_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                          )
                        )
                      : 0
                    return (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 p-3"
                      >
                        <div className="min-w-0 pr-2">
                          <h5 className="truncate text-sm font-medium text-foreground">
                            {exam.title}
                          </h5>
                          <p className="text-xs text-muted-foreground">{exam.subject}</p>
                        </div>
                        <Badge
                          variant={daysLeft <= 7 ? "destructive" : "secondary"}
                          className="shrink-0 text-xs font-mono rounded-lg"
                        >
                          J-{daysLeft}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
