"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  Timer,
  GraduationCap,
  MapPin,
  Check,
  User,
  LayoutGrid,
  ListFilter,
  X,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  MessageSquare,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDropzone } from "@/components/schedule/upload-dropzone";
import { KoccIcon } from "@/components/icons/kocc-icon";
import { cn } from "@/lib/utils";

export interface UnifiedAgendaItem {
  id: string;
  kind: "course" | "revision";
  title: string;
  subject: string;
  startTime: string; // "08:00"
  endTime: string; // "10:00"
  dayOfWeek: number; // 0 = Lundi ... 5 = Samedi
  dayName: string; // "Lundi"
  room?: string | null;
  professor?: string | null;
  priority?: "haute" | "moyenne" | "basse";
  completed?: boolean;
}

interface PositionedItem {
  item: UnifiedAgendaItem;
  top: number; // en pixels
  height: number; // en pixels
  colIndex: number; // 0, 1, ...
  totalCols: number; // nombre total de sous-colonnes pour ce créneau
}

const DAY_MAP_FROM_STR: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

const DAY_NAME_TO_FR: Record<string, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const SHORT_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];


const HOUR_HEIGHT = 64; // Hauteur fixe par heure en pixels pour une grille lisible

/**
 * Algorithme de détection de collision et répartition en sous-colonnes
 * identique aux standards Google Calendar / Apple Calendar
 */
function computeDayLayout(
  dayItems: UnifiedAgendaItem[],
  minHour: number,
  hourHeight: number
): PositionedItem[] {
  if (dayItems.length === 0) return [];

  const parseMinutes = (timeStr: string) => {
    const [h, m] = (timeStr || "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Trier par heure de début croissante, puis par durée décroissante
  const sorted = [...dayItems].sort((a, b) => {
    const startA = parseMinutes(a.startTime);
    const startB = parseMinutes(b.startTime);
    if (startA !== startB) return startA - startB;
    const durA = parseMinutes(a.endTime) - startA;
    const durB = parseMinutes(b.endTime) - startB;
    return durB - durA;
  });

  // Regroupement en clusters de chevauchement temporel
  const clusters: UnifiedAgendaItem[][] = [];
  let currentCluster: UnifiedAgendaItem[] = [];
  let clusterEnd = -1;

  for (const item of sorted) {
    const start = parseMinutes(item.startTime);
    const end = Math.max(parseMinutes(item.endTime), start + 30);

    if (start < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      if (currentCluster.length > 0) clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  const positioned: PositionedItem[] = [];

  for (const cluster of clusters) {
    const columns: number[] = [];
    const assigned: { item: UnifiedAgendaItem; col: number }[] = [];

    for (const item of cluster) {
      const start = parseMinutes(item.startTime);
      const end = Math.max(parseMinutes(item.endTime), start + 30);

      let placedCol = -1;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c] <= start) {
          placedCol = c;
          columns[c] = end;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = columns.length;
        columns.push(end);
      }
      assigned.push({ item, col: placedCol });
    }

    const totalCols = columns.length;

    for (const { item, col } of assigned) {
      const start = parseMinutes(item.startTime);
      const end = Math.max(parseMinutes(item.endTime), start + 30);
      const startHour = start / 60;
      const endHour = end / 60;

      const top = Math.max(0, (startHour - minHour) * hourHeight);
      const rawHeight = (endHour - startHour) * hourHeight;
      const height = Math.max(rawHeight, 48); // Hauteur minimale assurant la lisibilité

      positioned.push({
        item,
        top,
        height,
        colIndex: col,
        totalCols,
      });
    }
  }

  return positioned;
}

export default function UnifiedAgendaPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<UnifiedAgendaItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"week" | "day">("week");
  const [filterKind, setFilterKind] = React.useState<"all" | "course" | "revision">("all");

  const [currentTime, setCurrentTime] = React.useState<Date>(new Date());

  // Horloge temps réel pour l'indicateur d'heure actuelle
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const defaultDayIndex = React.useMemo(() => {
    const jsDay = currentTime.getDay();
    if (jsDay === 0) return 0; // Dimanche -> lundi
    return Math.min(jsDay - 1, 5);
  }, [currentTime]);

  const [selectedDayIndex, setSelectedDayIndex] = React.useState<number>(defaultDayIndex);
  const [isDropzoneOpen, setIsDropzoneOpen] = React.useState(false);
  const [isAnalyzingSchedule, setIsAnalyzingSchedule] = React.useState(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Statistiques Pomodoro aujourd'hui
  const [sessionsCompletedToday, setSessionsCompletedToday] = React.useState(0);

  // Détection vue mobile par défaut
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 1024) {
        setViewMode("day");
      }
    }
  }, []);

  // Charger les données unifiées de l'Agenda (Cours + Révisions)
  const fetchAgenda = React.useCallback(async () => {
    try {
      const res = await fetch("/api/schedule/planning");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const courseItems: UnifiedAgendaItem[] = (json.data.schedule_entries || []).map((c: any) => {
            const dayIdx = DAY_MAP_FROM_STR[c.day_of_week] ?? 0;
            return {
              id: `course-${c.id}`,
              kind: "course",
              title: c.subject_name,
              subject: c.subject_name,
              startTime: c.start_time,
              endTime: c.end_time,
              dayOfWeek: dayIdx,
              dayName: DAY_NAME_TO_FR[c.day_of_week] || c.day_of_week,
              room: c.room || null,
              professor: c.professor || null,
            };
          });

          const revisionItems: UnifiedAgendaItem[] = (json.data.slots || []).map((s: any) => {
            const dayIdx = DAY_MAP_FROM_STR[s.day_of_week] ?? 0;
            return {
              id: s.id,
              kind: "revision",
              title: s.focus_topic || `Révision : ${s.subject_name}`,
              subject: s.subject_name,
              startTime: s.start_time,
              endTime: s.end_time,
              dayOfWeek: dayIdx,
              dayName: DAY_NAME_TO_FR[s.day_of_week] || s.day_of_week,
              priority:
                s.priority === "high"
                  ? "haute"
                  : s.priority === "low"
                  ? "basse"
                  : "moyenne",
              completed: s.status === "completed",
            };
          });

          const combined = [...courseItems, ...revisionItems].sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
            return a.startTime.localeCompare(b.startTime);
          });
          setItems(combined);
        }
      }
    } catch (err) {
      console.error("Erreur chargement agenda unifié :", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Charger stats Pomodoro du jour
  const fetchPomodoroCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/pomodoro");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSessionsCompletedToday(json.data.completed_sessions_today || 0);
        }
      }
    } catch (err) {
      console.error("Erreur stats Pomodoro :", err);
    }
  }, []);

  React.useEffect(() => {
    fetchAgenda();
    fetchPomodoroCount();
  }, [fetchAgenda, fetchPomodoroCount]);

  // Si l'utilisateur arrive avec ?focus=Matière
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const focusSubj = params.get("focus");
      if (focusSubj) {
        setFilterKind("revision");
      }
    }
  }, []);

  // Bascule du statut d'un créneau de révision
  const toggleSlotComplete = async (slotId: string, currentStatus?: boolean) => {
    const nextCompleted = !currentStatus;
    setItems((prev) =>
      prev.map((it) => (it.id === slotId ? { ...it, completed: nextCompleted } : it))
    );

    try {
      await fetch("/api/schedule/planning", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slotId,
          status: nextCompleted ? "completed" : "pending",
        }),
      });
    } catch (err) {
      console.error("Erreur mise à jour créneau :", err);
    }
  };

  // Traitement direct de l'import PDF de l'emploi du temps
  const handleScheduleUpload = async (file: File) => {
    setIsAnalyzingSchedule(true);
    setFeedbackMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("save_immediately", "true");

      const res = await fetch("/api/schedule/parse", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Échec de l'analyse du document");
      }

      await fetchAgenda();
      setIsDropzoneOpen(false);
      setFeedbackMessage({
        type: "success",
        text: `Emploi du temps (${file.name}) importé avec succès (${json.data.count} cours). Votre agenda est à jour.`,
      });
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erreur lors du traitement de l'emploi du temps.",
      });
    } finally {
      setIsAnalyzingSchedule(false);
    }
  };

  // Plage horaire calculée pour la grille hebdomadaire (08h00 - 20h00 par défaut)
  const { minHour, maxHour, hours } = React.useMemo<{
    minHour: number;
    maxHour: number;
    hours: number[];
  }>(() => {
    let minH = 8;
    let maxH = 20;

    for (const item of items) {
      const [sh] = item.startTime.split(":").map(Number);
      const [eh, em] = item.endTime.split(":").map(Number);
      if (!isNaN(sh)) minH = Math.min(minH, sh);
      if (!isNaN(eh)) maxH = Math.max(maxH, em > 0 ? eh + 1 : eh);
    }

    minH = Math.max(minH, 7);
    maxH = Math.min(Math.max(maxH, minH + 8), 22);

    const total = maxH - minH;
    const list = Array.from({ length: total }, (_, i) => minH + i);
    return { minHour: minH, maxHour: maxH, hours: list };
  }, [items]);

  // Position de la ligne d'heure courante (temps réel)
  const currentHourPosition = React.useMemo(() => {
    const jsDay = currentTime.getDay();
    const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1; // 0 = Lundi, 5 = Samedi
    const currentDecimalHour = currentTime.getHours() + currentTime.getMinutes() / 60;

    if (dayOfWeek < 0 || dayOfWeek > 5) return null;
    if (currentDecimalHour < minHour || currentDecimalHour > maxHour) return null;

    const topPx = (currentDecimalHour - minHour) * HOUR_HEIGHT;
    return {
      dayOfWeek,
      topPx,
      timeString: `${currentTime.getHours().toString().padStart(2, "0")}:${currentTime
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
    };
  }, [currentTime, minHour, maxHour]);

  // Éléments filtrés
  const filteredItems = React.useMemo(() => {
    return items.filter((it) => {
      if (filterKind === "course") return it.kind === "course";
      if (filterKind === "revision") return it.kind === "revision";
      return true;
    });
  }, [items, filterKind]);

  // Statistiques d'en-tête
  const totalCourses = React.useMemo(
    () => items.filter((it) => it.kind === "course").length,
    [items]
  );
  const totalRevisions = React.useMemo(
    () => items.filter((it) => it.kind === "revision").length,
    [items]
  );
  const completedRevisions = React.useMemo(
    () => items.filter((it) => it.kind === "revision" && it.completed).length,
    [items]
  );


  return (
    <div className="h-full w-full flex flex-col gap-3 overflow-hidden">
      {/* 1. EN-TÊTE ÉPURÉ AVEC ACTIONS & STATISTIQUES */}
      <div className="shrink-0 flex flex-col gap-2.5 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-amber-400 dark:bg-slate-800 border border-slate-700">
                <CalendarIcon className="h-4 w-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Planning &amp; Emploi du temps
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Vos cours universitaires et vos créneaux de révision réunis sur un seul calendrier hebdomadaire interactif.
            </p>
          </div>

          {/* Boutons d'action rapide à droite */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsRefreshing(true);
                fetchAgenda();
              }}
              disabled={isRefreshing}
              className="h-8 px-2.5 text-xs text-slate-700 dark:text-slate-300 gap-1.5"
              title="Synchroniser"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsDropzoneOpen((prev) => !prev)}
              className="h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 gap-1.5"
            >
              <Upload className="h-3.5 w-3.5 text-amber-400" />
              <span>{isDropzoneOpen ? "Fermer l'import" : "Importer Emploi du Temps (PDF)"}</span>
            </Button>
          </div>
        </div>

        {/* Zone rétractable de dépôt de l'emploi du temps */}
        {isDropzoneOpen && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
            <UploadDropzone
              onFileAnalyzed={handleScheduleUpload}
              isAnalyzing={isAnalyzingSchedule}
            />
          </div>
        )}

        {/* Bannière de feedback notification */}
        {feedbackMessage && (
          <div
            className={cn(
              "px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150",
              feedbackMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/30"
            )}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="p-1 hover:opacity-75 cursor-pointer"
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 2. STATS & CONTRÔLES DU TABLEAU UNIFIÉ */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Badges de synthèse académique */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 gap-1.5"
            >
              <GraduationCap className="h-3 w-3 text-slate-700 dark:text-slate-300" />
              <span>{totalCourses} cours universitaires</span>
            </Badge>

            <Badge
              variant="outline"
              className="text-[11px] font-medium bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-500/30 gap-1.5"
            >
              <KoccIcon className="h-3 w-3 text-amber-600" />
              <span>
                {completedRevisions}/{totalRevisions} révisions faites
              </span>
            </Badge>

            <Badge
              variant="outline"
              className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 gap-1.5"
            >
              <Timer className="h-3 w-3 text-amber-500" />
              <span>{sessionsCompletedToday} sessions Focus aujourd&apos;hui</span>
            </Badge>
          </div>

          {/* Filtres & Bascule Semaine / Jour */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre Type */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setFilterKind("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer",
                  filterKind === "all"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                Tout ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterKind("course")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer",
                  filterKind === "course"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                <GraduationCap className="h-3 w-3" />
                Cours ({totalCourses})
              </button>
              <button
                type="button"
                onClick={() => setFilterKind("revision")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer",
                  filterKind === "revision"
                    ? "bg-white text-amber-900 shadow-2xs dark:bg-slate-900 dark:text-amber-300"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                <KoccIcon className="h-3 w-3 text-amber-600" />
                Révisions ({totalRevisions})
              </button>
            </div>

            {/* Toggle Vue Semaine / Vue Jour */}
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                  viewMode === "week"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                <LayoutGrid className="h-3 w-3" />
                <span>Grille Semaine</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                  viewMode === "day"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                <ListFilter className="h-3 w-3" />
                <span>Vue Jour</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CALENDRIER UNIFIÉ : COURS & RÉVISIONS */}
      <div className="flex-1 min-h-0 border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-dashed">
            <CalendarIcon className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Aucun créneau pour ce filtre
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Importez votre emploi du temps PDF ci-dessus pour générer automatiquement l&apos;ensemble de vos cours et créneaux de révision.
            </p>
          </div>
        ) : viewMode === "week" ? (
          /* VUE SEMAINE : GRILLE HEBDOMADAIRE UNIFIÉE */
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            {/* Ligne des en-têtes de colonnes (Jours) */}
            <div className="sticky top-0 z-20 grid grid-cols-[60px_repeat(6,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold divide-x divide-slate-200/80 dark:divide-slate-800 select-none">
              <div className="py-2 px-1 text-center text-slate-400 text-[11px] font-mono flex items-center justify-center">
                Heure
              </div>
              {DAYS.map((day, idx) => {
                const dayItems = filteredItems.filter((it) => it.dayOfWeek === idx);
                const isToday = defaultDayIndex === idx;

                return (
                  <div
                    key={day}
                    className={cn(
                      "py-2 px-2 text-center flex items-center justify-center gap-1.5 truncate relative",
                      isToday
                        ? "bg-amber-500/10 text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{SHORT_DAYS[idx]}</span>
                    {isToday && (
                      <span className="hidden md:inline-block text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded">
                        Aujourd&apos;hui
                      </span>
                    )}
                    {dayItems.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {dayItems.length}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grille horaire minHour - maxHour avec positionnement et collision tracks */}
            <div
              style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
              className="relative shrink-0 grid grid-cols-[60px_repeat(6,1fr)] divide-x divide-slate-100 dark:divide-slate-800/80"
            >
              {/* Colonne des heures fixes */}
              <div className="flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 select-none">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="flex items-start justify-center pt-1 text-[11px] text-slate-400 font-mono border-b border-dashed border-slate-200/70 dark:border-slate-800/60 last:border-b-0"
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* 6 Colonnes des jours (Lundi à Samedi) */}
              {DAYS.map((_, dayIndex) => {
                const dayItems = filteredItems.filter((it) => it.dayOfWeek === dayIndex);
                const positionedItems = computeDayLayout(dayItems, minHour, HOUR_HEIGHT);
                const isToday = defaultDayIndex === dayIndex;

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "relative h-full transition-colors",
                      isToday
                        ? "bg-amber-500/[0.02] dark:bg-amber-500/[0.03]"
                        : "bg-white dark:bg-slate-900/40"
                    )}
                  >
                    {/* Lignes horizontales en arrière-plan (heure & demi-heure) */}
                    <div className="absolute inset-0 flex flex-col pointer-events-none">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-dashed border-slate-200/70 dark:border-slate-800/60 last:border-b-0"
                        />
                      ))}
                    </div>

                    {/* Ligne d'heure actuelle en direct si c'est aujourd'hui */}
                    {currentHourPosition && currentHourPosition.dayOfWeek === dayIndex && (
                      <div
                        style={{ top: `${currentHourPosition.topPx}px` }}
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                      >
                        <div className="h-2 w-2 rounded-full bg-red-500 shadow-xs ring-2 ring-white dark:ring-slate-900 -ml-1" />
                        <div className="h-[2px] flex-1 bg-red-500/80" />
                        <span className="text-[9px] font-mono font-bold text-red-600 dark:text-red-400 bg-white dark:bg-slate-900 px-1 rounded shadow-2xs mr-1 border border-red-500/20">
                          {currentHourPosition.timeString}
                        </span>
                      </div>
                    )}

                    {/* Créneaux positionnés sans collision */}
                    {positionedItems.map(({ item, top, height, colIndex, totalCols }) => {
                      const leftPercent = (colIndex / totalCols) * 100;
                      const widthPercent = 100 / totalCols;

                      if (item.kind === "course") {
                        // CRÉNEAU COURS MAGISTRAL (EDT)
                        return (
                          <div
                            key={item.id}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              left: `calc(${leftPercent}% + 2px)`,
                              width: `calc(${widthPercent}% - 4px)`,
                            }}
                            className="absolute rounded-lg p-2 border shadow-2xs z-10 hover:z-20 hover:shadow-md transition-all duration-150 flex flex-col justify-between overflow-hidden bg-slate-900 text-white border-slate-700/80 dark:bg-slate-800 dark:border-slate-700"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 border-slate-600 bg-slate-800 text-slate-200"
                                >
                                  <GraduationCap className="h-2.5 w-2.5 mr-1" />
                                  Cours
                                </Badge>
                                <span className="text-[10px] font-mono text-amber-300 font-semibold truncate">
                                  {item.startTime}–{item.endTime}
                                </span>
                              </div>
                              <p className="text-xs font-bold leading-snug mt-1 truncate">
                                {item.subject}
                              </p>
                              {(item.room || item.professor) && (
                                <p className="text-[10px] text-slate-300 truncate mt-0.5">
                                  {item.room ? `Salle ${item.room}` : item.professor}
                                </p>
                              )}
                            </div>

                            <Link
                              href={`/courses?subject=${encodeURIComponent(item.subject)}`}
                              className="self-end text-[10px] font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 pt-0.5"
                            >
                              <BookOpen className="h-3 w-3" />
                              <span>Support</span>
                            </Link>
                          </div>
                        );
                      }

                      // CRÉNEAU RÉVISION KOCC
                      const displayTitle = item.title
                        .replace(/\[J\+\d+[^\]]*\]\s*[-:]?\s*/gi, "")
                        .replace(/J\+\d+\s*[-:]?\s*/gi, "")
                        .trim();

                      const isFutureDay = item.dayOfWeek > defaultDayIndex;

                      return (
                        <div
                          key={item.id}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `calc(${leftPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`,
                          }}
                          onClick={() => {
                            if (isFutureDay) return;
                            router.push(`/courses?subject=${encodeURIComponent(item.subject)}`);
                          }}
                          title={
                            isFutureDay
                              ? `Créneau planifié pour ${item.dayName} • Accessible le jour de la révision`
                              : `Ouvrir la session d'étude : ${item.subject}`
                          }
                          className={cn(
                            "absolute rounded-lg p-2 border shadow-2xs z-10 transition-all duration-150 flex flex-col justify-between overflow-hidden",
                            isFutureDay
                              ? "bg-slate-100/90 text-slate-500 border-slate-200 dark:bg-slate-900/60 dark:text-slate-500 dark:border-slate-800 cursor-not-allowed opacity-75"
                              : "cursor-pointer hover:z-20 hover:shadow-md",
                            !isFutureDay && item.completed
                              ? "bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 border-emerald-500/35 dark:border-emerald-500/30 opacity-80"
                              : !isFutureDay
                              ? "bg-amber-500/10 text-amber-950 dark:text-amber-200 border-amber-500/40 dark:border-amber-500/30 ring-1 ring-inset ring-amber-500/20 hover:border-amber-500/80"
                              : ""
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={isFutureDay}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isFutureDay) return;
                                    toggleSlotComplete(item.id, item.completed);
                                  }}
                                  className={cn(
                                    "h-4 w-4 rounded flex items-center justify-center border transition-colors shrink-0",
                                    isFutureDay
                                      ? "cursor-not-allowed opacity-40 border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-transparent"
                                      : "cursor-pointer",
                                    !isFutureDay && item.completed
                                      ? "bg-emerald-600 border-emerald-600 text-white"
                                      : !isFutureDay
                                      ? "border-amber-600/50 bg-white dark:bg-slate-900 text-transparent hover:border-amber-700"
                                      : ""
                                  )}
                                  title={
                                    isFutureDay
                                      ? "Accessible le jour venu"
                                      : item.completed
                                      ? "Marquer à réviser"
                                      : "Valider ce créneau"
                                  }
                                >
                                  {isFutureDay ? (
                                    <Lock className="h-2.5 w-2.5 text-slate-400" />
                                  ) : (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </button>
                                <span
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider flex items-center gap-1",
                                    isFutureDay
                                      ? "text-slate-500 dark:text-slate-500"
                                      : "text-amber-800 dark:text-amber-300"
                                  )}
                                >
                                  {isFutureDay ? (
                                    <>
                                      <Lock className="h-2.5 w-2.5" />
                                      À venir
                                    </>
                                  ) : (
                                    "Révision"
                                  )}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-semibold truncate">
                                {item.startTime}–{item.endTime}
                              </span>
                            </div>

                            {/* NOM DIRECT DE LA MATIÈRE EN TITRE PRINCIPAL */}
                            <p
                              className={cn(
                                "text-xs font-bold leading-tight mt-1 truncate",
                                isFutureDay
                                  ? "text-slate-700 dark:text-slate-400"
                                  : "text-amber-950 dark:text-amber-100",
                                item.completed && "line-through opacity-80"
                              )}
                            >
                              {item.subject}
                            </p>
                            {displayTitle && displayTitle.toLowerCase() !== item.subject.toLowerCase() && (
                              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {displayTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VUE JOUR : SÉLECTEUR DE JOUR ET TIMELINE CHRONOLOGIQUE */
          <div className="flex-1 min-h-0 flex flex-col p-3.5 gap-3 overflow-hidden">
            {/* Barre des 6 jours avec compteurs */}
            <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {DAYS.map((day, idx) => {
                const dayItems = filteredItems.filter((it) => it.dayOfWeek === idx);
                const isSelected = selectedDayIndex === idx;
                const isToday = defaultDayIndex === idx;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={cn(
                      "flex-1 min-w-[70px] py-2 px-2 rounded-lg border text-center transition-all duration-150 cursor-pointer",
                      isSelected
                        ? "bg-slate-900 text-white border-slate-800 ring-1 ring-inset ring-amber-400/30 dark:bg-slate-800"
                        : "bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="block text-xs font-bold">{day}</span>
                      {isToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-block text-[10px] font-semibold px-1.5 rounded mt-0.5",
                        isSelected
                          ? "text-amber-300"
                          : dayItems.length > 0
                          ? "text-slate-700 dark:text-slate-300"
                          : "text-slate-400"
                      )}
                    >
                      {dayItems.length} créneau{dayItems.length > 1 ? "x" : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Liste chronologique du jour sélectionné */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
              {filteredItems.filter((it) => it.dayOfWeek === selectedDayIndex).length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Clock className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Aucun cours ni révision prévus pour {DAYS[selectedDayIndex]}.
                  </p>
                </Card>
              ) : (
                filteredItems
                  .filter((it) => it.dayOfWeek === selectedDayIndex)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((item) => {
                    if (item.kind === "course") {
                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 gap-3"
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-center">
                              <GraduationCap className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-semibold bg-white dark:bg-slate-900"
                                >
                                  Cours
                                </Badge>
                                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                  {item.subject}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                  <Clock className="h-3 w-3" />
                                  {item.startTime} - {item.endTime}
                                </span>
                                {item.room && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    Salle {item.room}
                                  </span>
                                )}
                                {item.professor && (
                                  <span className="inline-flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {item.professor}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Link
                            href={`/courses?subject=${encodeURIComponent(item.subject)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors shrink-0 self-end sm:self-center"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            Supports de cours
                          </Link>
                        </div>
                      );
                    }

                    const displayTitle = item.title
                      .replace(/\[J\+\d+[^\]]*\]\s*[-:]?\s*/gi, "")
                      .replace(/J\+\d+\s*[-:]?\s*/gi, "")
                      .trim();

                    const isFutureDay = item.dayOfWeek > defaultDayIndex;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isFutureDay) return;
                          router.push(`/courses?subject=${encodeURIComponent(item.subject)}`);
                        }}
                        title={
                          isFutureDay
                            ? `Créneau planifié pour ${item.dayName} • Accessible le jour de la révision`
                            : `Ouvrir la session d'étude : ${item.subject}`
                        }
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 group",
                          isFutureDay
                            ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-75"
                            : "cursor-pointer",
                          !isFutureDay && item.completed
                            ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80"
                            : !isFutureDay
                            ? "bg-white dark:bg-slate-900 border-amber-500/35 dark:border-amber-500/30 shadow-2xs hover:border-amber-500/70 hover:shadow-xs"
                            : ""
                        )}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <button
                            type="button"
                            disabled={isFutureDay}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isFutureDay) return;
                              toggleSlotComplete(item.id, item.completed);
                            }}
                            className={cn(
                              "h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center transition-colors shrink-0",
                              isFutureDay
                                ? "cursor-not-allowed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400"
                                : "cursor-pointer",
                              !isFutureDay && item.completed
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : !isFutureDay
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                                : ""
                            )}
                            title={
                              isFutureDay
                                ? "Accessible le jour venu"
                                : item.completed
                                ? "Marquer à réviser"
                                : "Valider ce créneau"
                            }
                          >
                            {isFutureDay ? (
                              <Lock className="h-4 w-4" />
                            ) : item.completed ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <KoccIcon className="h-4 w-4" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold gap-1",
                                  isFutureDay
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
                                    : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                                )}
                              >
                                {isFutureDay ? (
                                  <>
                                    <Lock className="h-2.5 w-2.5" />
                                    À venir
                                  </>
                                ) : (
                                  "Révision"
                                )}
                              </Badge>

                              {/* TITRE PRINCIPAL : NOM DIRECT DE LA MATIÈRE */}
                              <span
                                className={cn(
                                  "font-bold text-sm text-slate-900 dark:text-white truncate",
                                  item.completed && "line-through opacity-75"
                                )}
                              >
                                {item.subject}
                              </span>
                            </div>

                            {/* SOUS-TITRE : DÉTAIL DU COURS OU FOCUS TOPIC */}
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2.5">
                              <span className="font-semibold text-amber-700 dark:text-amber-400">
                                {item.startTime} - {item.endTime}
                              </span>
                              {displayTitle && displayTitle.toLowerCase() !== item.subject.toLowerCase() && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-slate-600 dark:text-slate-400 truncate max-w-xs">
                                    {displayTitle}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* BOUTON D'ACTION OU BADGE VERROUILLÉ */}
                        {isFutureDay ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 shrink-0 self-end sm:self-center">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Déblocage le {item.dayName}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300 shrink-0 self-end sm:self-center transition-colors">
                            <span>Espace Étude</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
