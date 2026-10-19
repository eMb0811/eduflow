"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  Calendar,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Brain,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Timer,
  Layers,
  Check,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { KoccIcon } from "@/components/icons/kocc-icon";
import { usePomodoro } from "@/components/pomodoro/pomodoro-context";
import { cn } from "@/lib/utils";

interface DashboardData {
  profile: {
    id: string;
    email: string;
    full_name: string;
    academic_level: string | null;
    field_of_study: string | null;
  };
  upcoming_classes: Array<{
    id: string;
    subject_name: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    room?: string | null;
    professor?: string | null;
    color?: string;
  }>;
  today_study_blocks: Array<{
    id: string;
    plan_id: string;
    subject_name: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    focus_topic?: string | null;
    priority: string;
    status: string;
  }>;
  stats: {
    total_study_minutes: number;
    total_sessions: number;
    streak_days: number;
    weekly_goal_progress: number;
  };
}

function formatAcademicLevel(level?: string | null): string {
  if (!level) return "Cursus Universitaire";
  const map: Record<string, string> = {
    licence_1: "Licence 1 (L1)",
    licence_2: "Licence 2 (L2)",
    licence_3: "Licence 3 (L3)",
    master_1: "Master 1 (M1)",
    master_2: "Master 2 (M2)",
    doctorat: "Doctorat",
    prepa: "Classes Préparatoires",
  };
  return map[level.toLowerCase()] || level;
}

function formatChrono(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const pomodoro = usePomodoro();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Charger les données réelles du tableau de bord
  const fetchDashboardData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Erreur lors du chargement du tableau de bord :", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Date actuelle formatée en français soigné
  const formattedDate = React.useMemo(() => {
    const now = new Date();
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
  }, []);

  // Calcul mémorisé des blocs de révision du jour (toujours appelé au premier niveau avant tout return)
  const sortedStudyBlocks = React.useMemo(() => {
    if (!data?.today_study_blocks) return [];
    return [...data.today_study_blocks].sort((a, b) => {
      const aIsActive =
        pomodoro.isActive &&
        pomodoro.subjectName &&
        a.subject_name.toLowerCase() === pomodoro.subjectName.toLowerCase();
      const bIsActive =
        pomodoro.isActive &&
        pomodoro.subjectName &&
        b.subject_name.toLowerCase() === pomodoro.subjectName.toLowerCase();

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;

      return a.start_time.localeCompare(b.start_time);
    });
  }, [data?.today_study_blocks, pomodoro.isActive, pomodoro.subjectName]);

  const toggleTaskCompletion = async (
    e: React.MouseEvent,
    taskId: string,
    currentStatus: string
  ) => {
    e.stopPropagation();
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        today_study_blocks: (prev.today_study_blocks || []).map((b) =>
          b.id === taskId ? { ...b, status: newStatus } : b
        ),
      };
    });

    try {
      await fetch("/api/schedule/planning", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: taskId, status: newStatus }),
      });
    } catch (err) {
      console.warn("Échec de mise à jour de la révision :", err);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const studentName =
    data.profile?.full_name || user?.email?.split("@")[0] || "Étudiant";
  const studyHours = (((data.stats?.total_study_minutes || 0) / 60)).toFixed(1);
  const totalRevisions = data.today_study_blocks?.length || 0;
  const completedRevisions = (data.today_study_blocks || []).filter(
    (b) => b.status === "completed"
  ).length;
  const pendingRevisionsCount = Math.max(0, totalRevisions - completedRevisions);
  const upcomingClasses = data.upcoming_classes || [];

  return (
    <div className="space-y-6 pb-8">
      {/* BANDEAU SESSION FOCUS EN COURS (POUR NE PAS SE PERDRE) */}
      {pomodoro.isActive && pomodoro.subjectName && (
        <section>
          <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/25 border border-amber-500/50 text-amber-400">
                <Timer className="h-5 w-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-sm">
                    Session en cours
                  </span>
                  <span className="text-sm font-bold text-white truncate">
                    {pomodoro.subjectName}
                    {pomodoro.documentTitle && ` • ${pomodoro.documentTitle}`}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Chrono actif : <strong className="text-amber-400 font-mono font-bold text-sm">{formatChrono(pomodoro.timeLeft)}</strong> • Le minuteur reste actif même en naviguant dans l&apos;application.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Link href={`/courses?subject=${encodeURIComponent(pomodoro.subjectName)}&open=1`}>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold h-9 gap-1.5 rounded-lg shadow-xs cursor-pointer">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Reprendre la révision</span>
                </Button>
              </Link>
              <Link href={`/chat?subject=${encodeURIComponent(pomodoro.subjectName)}`}>
                <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs h-9 gap-1.5 rounded-lg cursor-pointer">
                  <KoccIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>Aide Kocc</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 1. CARTE DE BIENVENUE ACADÉMIQUE */}
      <section>
        <Card className="relative overflow-hidden border-slate-800 bg-slate-900 text-slate-100 shadow-sm rounded-2xl">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-5 sm:p-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span className="capitalize">{formattedDate}</span>
                </div>
                {(data.profile?.academic_level || data.profile?.field_of_study) && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-300 px-2.5 py-0.5 text-xs font-medium border border-amber-500/30">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                    {data.profile?.field_of_study || formatAcademicLevel(data.profile?.academic_level)}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Bonjour, {studentName}
              </h1>

              <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
                Aujourd&apos;hui :{" "}
                <strong className="text-white">
                  {upcomingClasses.length} cours
                </strong>{" "}
                prévu{upcomingClasses.length > 1 ? "s" : ""} et{" "}
                <strong className="text-amber-300">
                  {pendingRevisionsCount} session{pendingRevisionsCount > 1 ? "s" : ""} de révision
                </strong>{" "}
                au programme.
              </p>
            </div>

            {/* Actions rapides */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link href="/planning">
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white text-xs h-9 gap-1.5 rounded-lg"
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span>Agenda &amp; Planning</span>
                </Button>
              </Link>
              <Link href="/courses">
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold h-9 gap-1.5 rounded-lg shadow-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Espace Étude</span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. STATISTIQUES CONCRÈTES ET RÉELLES */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Heures d'étude effectives */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Temps d&apos;étude
              </p>
              <div className="rounded-lg p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {studyHours}h
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Enregistré via Pomodoro
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Focus validées */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Cycles Focus
              </p>
              <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {data.stats?.total_sessions || 0}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Sessions complétées
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cours programmés */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Cours du jour
              </p>
              <div className="rounded-lg p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {upcomingClasses.length}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Créneaux académiques
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Révisions complétées */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Objectif Révision
              </p>
              <div className="rounded-lg p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30">
                <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {completedRevisions} / {totalRevisions}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {totalRevisions > 0
                  ? `${Math.round((completedRevisions / totalRevisions) * 100)}% validé aujourd'hui`
                  : "Aucune révision requise"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. SECTION CENTRALE : COURS DU JOUR & RÉVISIONS DU JOUR */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* COLONNE 1 : COURS DU JOUR */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3 border-b border-[#E8E4DC] dark:border-slate-800">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Cours du jour</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Créneaux synchronisés de votre emploi du temps
              </CardDescription>
            </div>
            <Link href="/planning">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 gap-1"
              >
                <span>Agenda</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-5 flex-1 space-y-3">
            {upcomingClasses.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-[#E8E4DC] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Aucun cours prévu aujourd&apos;hui
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Profitez de cette journée libre pour consolider vos synthèses ou réviser vos matières.
                </p>
                <Link href="/planning" className="mt-3">
                  <Button variant="outline" size="sm" className="h-7 text-xs border-[#E8E4DC]">
                    Consulter le planning hebdomadaire
                  </Button>
                </Link>
              </div>
            ) : (
              upcomingClasses.map((course) => (
                <div
                  key={course.id}
                  onClick={() =>
                    router.push(
                      `/courses?subject=${encodeURIComponent(course.subject_name)}`
                    )
                  }
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E8E4DC] dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500/50 dark:hover:border-amber-500/40 active:scale-[0.99] hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                        {course.subject_name}
                      </span>
                      {course.room && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 border-[#E8E4DC] dark:border-slate-800"
                        >
                          {course.room}
                        </Badge>
                      )}
                    </div>
                    {course.professor && (
                      <p className="text-[11px] text-slate-500 truncate">
                        Enseignant : {course.professor}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-[#E8E4DC] dark:border-slate-700">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>
                        {course.start_time} - {course.end_time}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* COLONNE 2 : RÉVISIONS DU JOUR */}
        <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-3 border-b border-[#E8E4DC] dark:border-slate-800">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Révisions du jour</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Sessions recommandées par votre planning
              </CardDescription>
            </div>
            <Link href="/planning">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 gap-1"
              >
                <span>Planning</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-5 flex-1 space-y-2.5">
            {totalRevisions === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-[#E8E4DC] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Aucune révision programmée pour aujourd&apos;hui
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Générez un planning intelligent depuis votre agenda ou lancez une session libre dans vos cours.
                </p>
                <Link href="/planning" className="mt-3">
                  <Button variant="outline" size="sm" className="h-7 text-xs border-[#E8E4DC]">
                    Générer mon planning de révision
                  </Button>
                </Link>
              </div>
            ) : (
              sortedStudyBlocks.map((slot) => {
                const isDone = slot.status === "completed";
                const isSlotActive =
                  pomodoro.isActive &&
                  pomodoro.subjectName &&
                  slot.subject_name.toLowerCase() === pomodoro.subjectName.toLowerCase();

                return (
                  <div
                    key={slot.id}
                    onClick={() =>
                      router.push(
                        `/courses?subject=${encodeURIComponent(slot.subject_name)}`
                      )
                    }
                    className={cn(
                      "group flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer",
                      isSlotActive
                        ? "border-amber-500 bg-amber-500/[0.04] ring-1 ring-amber-500/50 shadow-xs"
                        : isDone
                        ? "bg-slate-50/70 border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-800 opacity-65"
                        : "bg-white dark:bg-slate-900 border-[#E8E4DC] dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-xs"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Coche pour valider la tâche */}
                      <button
                        type="button"
                        onClick={(e) =>
                          toggleTaskCompletion(e, slot.id, slot.status)
                        }
                        className={cn(
                          "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                          isDone
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500"
                        )}
                        title={
                          isDone
                            ? "Marquer comme à faire"
                            : "Marquer comme terminée"
                        }
                      >
                        {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-xs sm:text-sm font-semibold truncate",
                            isDone
                              ? "line-through text-slate-400"
                              : "text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400"
                          )}
                        >
                          {slot.subject_name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {slot.focus_topic || "Session d'approfondissement"} • {slot.start_time} - {slot.end_time}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSlotActive ? (
                        <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
                          En cours ({formatChrono(pomodoro.timeLeft)})
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] py-0.5 px-2 font-medium",
                            slot.priority === "high"
                              ? "bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-500/20"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          )}
                        >
                          {slot.priority === "high" ? "Prioritaire" : "Standard"}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 hidden sm:inline-flex"
                      >
                        <span>{isSlotActive ? "Reprendre" : "Étudier"}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>

      {/* 4. BANDEAU D'ACCÈS DIRECT : ESPACE ÉTUDE & ASSISTANT KOCC */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accès Espace Étude & Révisions */}
        <Link href="/courses" className="block group">
          <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600 transition-all p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-400 dark:bg-slate-800 border border-slate-800 dark:border-slate-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Espace Étude &amp; Révisions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Accédez aux fiches de révision, flashcards interactives et quiz par matière.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </Card>
        </Link>

        {/* Accès Kocc Barma */}
        <Link href="/chat" className="block group">
          <Card className="academic-frame bg-white dark:bg-slate-900/90 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600 transition-all p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 border border-amber-500/30">
                  <KoccIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Poser une question à Kocc Barma
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Éclaircissez une notion complexe ou demandez une explication pas à pas.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </Card>
        </Link>
      </section>
    </div>
  );
}
