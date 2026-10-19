"use client";

import * as React from "react";
import {
  Clock,
  MapPin,
  User,
  Info,
  Calendar as CalendarIcon,
  LayoutGrid,
  ListFilter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CourseSession {
  id: string;
  courseName: string;
  room: string;
  professor?: string;
  dayOfWeek: number; // 0 = Lundi ... 5 = Samedi
  startTime: string; // "08:00"
  endTime: string; // "10:00"
  colorClass: {
    bg: string;
    border: string;
    text: string;
    badge: string;
  };
}

interface WeeklyCalendarProps {
  courses: CourseSession[];
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const SHORT_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function WeeklyCalendar({ courses }: WeeklyCalendarProps) {
  const [hoveredCourse, setHoveredCourse] = React.useState<CourseSession | null>(null);

  const defaultDayIndex = React.useMemo(() => {
    const jsDay = new Date().getDay();
    if (jsDay === 0) return 0;
    return Math.min(jsDay - 1, 5);
  }, []);

  const [selectedDayIndex, setSelectedDayIndex] = React.useState<number>(defaultDayIndex);
  const [viewMode, setViewMode] = React.useState<"day" | "week">("week");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setViewMode(window.innerWidth >= 1024 ? "week" : "day");
    }
  }, []);

  // Plage horaire ajustée automatiquement aux cours (par défaut 08h00 - 18h00)
  const { minHour, maxHour, hours } = React.useMemo(() => {
    let minH = 8;
    let maxH = 18;

    for (const c of courses) {
      const [sh] = c.startTime.split(":").map(Number);
      const [eh, em] = c.endTime.split(":").map(Number);
      if (!isNaN(sh)) minH = Math.min(minH, sh);
      if (!isNaN(eh)) maxH = Math.max(maxH, em > 0 ? eh + 1 : eh);
    }

    const total = Math.max(maxH - minH, 8);
    const list = Array.from({ length: total }, (_, i) => minH + i);
    return { minHour: minH, maxHour: minH + total, hours: list };
  }, [courses]);

  const calculatePosition = (startTime: string, endTime: string) => {
    const parseTime = (time: string) => {
      const [h, m] = time.split(":").map(Number);
      return h + (m || 0) / 60;
    };

    const start = Math.max(minHour, parseTime(startTime));
    const end = Math.min(maxHour, parseTime(endTime));
    const totalSpan = maxHour - minHour;

    const top = ((start - minHour) / totalSpan) * 100;
    const height = Math.max(((end - start) / totalSpan) * 100, 8);

    return { top: `${top}%`, height: `${height}%` };
  };

  const selectedDayCourses = React.useMemo(() => {
    return courses
      .filter((c) => c.dayOfWeek === selectedDayIndex)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [courses, selectedDayIndex]);

  const courseCountByDay = React.useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (const c of courses) {
      if (c.dayOfWeek >= 0 && c.dayOfWeek <= 5) {
        counts[c.dayOfWeek]++;
      }
    }
    return counts;
  }, [courses]);

  return (
    <div className="flex-1 min-h-0 border border-slate-200/90 dark:border-slate-800 ring-1 ring-inset ring-slate-900/[0.04] dark:ring-white/[0.05] rounded-xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col">
      {/* Barre d'outils compacte */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              {viewMode === "day"
                ? `${DAYS[selectedDayIndex]} (${selectedDayCourses.length} cours)`
                : `Grille Hebdomadaire (${minHour}h00 – ${maxHour}h00 • ${courses.length} cours)`}
            </span>
          </div>

          {hoveredCourse && (
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] animate-in fade-in duration-150">
              <Info className="h-3 w-3 text-amber-400 shrink-0" />
              <span className="font-semibold truncate max-w-[200px]">
                {hoveredCourse.courseName}
              </span>
              {(hoveredCourse.room || hoveredCourse.professor) && (
                <>
                  <span className="text-slate-400">•</span>
                  <span>{hoveredCourse.room || hoveredCourse.professor}</span>
                </>
              )}
              <span className="font-mono text-amber-400">
                {hoveredCourse.startTime}–{hoveredCourse.endTime}
              </span>
            </div>
          )}
        </div>

        {/* Sélecteur de vue : Jour / Semaine */}
        <div className="flex items-center rounded-lg bg-slate-200/80 dark:bg-slate-800 p-0.5 border border-slate-300/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
              viewMode === "day"
                ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ListFilter className="h-3 w-3" />
            <span>Vue Jour</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
              viewMode === "week"
                ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <LayoutGrid className="h-3 w-3" />
            <span>Vue Semaine</span>
          </button>
        </div>
      </div>

      {/* 1. VUE JOUR */}
      {viewMode === "day" ? (
        <div className="flex-1 min-h-0 flex flex-col p-3.5 gap-3 overflow-hidden">
          <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {DAYS.map((day, idx) => {
              const count = courseCountByDay[idx];
              const isSelected = selectedDayIndex === idx;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  className={cn(
                    "flex-1 min-w-[54px] py-1.5 px-2 rounded-lg border text-center transition-all duration-150",
                    isSelected
                      ? "bg-slate-900 text-white border-slate-800 ring-1 ring-inset ring-amber-400/30 dark:bg-slate-800"
                      : "bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                  )}
                >
                  <span className="block text-[11px] font-bold sm:hidden">
                    {SHORT_DAYS[idx]}
                  </span>
                  <span className="hidden sm:block text-xs font-bold">{day}</span>
                  <span
                    className={cn(
                      "inline-block text-[10px] font-medium px-1.5 rounded",
                      isSelected
                        ? "text-amber-300"
                        : count > 0
                        ? "text-slate-500"
                        : "text-slate-300 dark:text-slate-600"
                    )}
                  >
                    {count} cours
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {selectedDayCourses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <CalendarIcon className="h-7 w-7 text-slate-400 mb-1.5 opacity-60" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Aucun cours ce {DAYS[selectedDayIndex].toLowerCase()}
                </p>
              </div>
            ) : (
              selectedDayCourses.map((course) => (
                <div
                  key={course.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all gap-2",
                    course.colorClass.bg,
                    course.colorClass.border,
                    course.colorClass.text
                  )}
                >
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-sm font-bold tracking-tight truncate">
                      {course.courseName}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs opacity-90">
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="h-3 w-3" />
                        {course.startTime} - {course.endTime}
                      </span>
                      {course.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {course.room}
                        </span>
                      )}
                      {course.professor && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {course.professor}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-white/80 dark:bg-slate-900/80 shrink-0"
                  >
                    Cours / TD
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* 2. VUE SEMAINE COMPACTE SANS DÉFILEMENT VERTICAL */
        <div className="flex-1 min-h-0 flex flex-col overflow-x-auto overflow-y-hidden">
          <div className="flex-1 min-h-0 min-w-[680px] flex flex-col">
            {/* Entête des jours */}
            <div className="shrink-0 grid grid-cols-[64px_repeat(6,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="py-2 px-1 border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-400">
                Heure
              </div>
              {DAYS.map((day, idx) => (
                <div
                  key={day}
                  className={cn(
                    "py-2 px-2 flex items-center justify-center gap-1.5",
                    idx < DAYS.length - 1
                      ? "border-r border-slate-200 dark:border-slate-800"
                      : ""
                  )}
                >
                  <span>{day}</span>
                  {courseCountByDay[idx] > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                      {courseCountByDay[idx]}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Grille horaire auto-ajustée sur toute la hauteur disponible */}
            <div className="flex-1 min-h-0 grid grid-cols-[64px_repeat(6,1fr)] divide-x divide-slate-100 dark:divide-slate-800/80">
              {/* Colonne des heures */}
              <div className="flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 select-none">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 min-h-0 flex items-start justify-center pt-1 text-[11px] text-slate-400 font-mono border-b border-dashed border-slate-100 dark:border-slate-800/50 last:border-b-0"
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Colonnes des 6 jours */}
              {DAYS.map((_, dayIndex) => {
                const dayCourses = courses.filter((c) => c.dayOfWeek === dayIndex);

                return (
                  <div
                    key={dayIndex}
                    className="relative h-full bg-white dark:bg-slate-900/40"
                  >
                    {/* Lignes horizontales compactes */}
                    <div className="absolute inset-0 flex flex-col pointer-events-none">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="flex-1 border-b border-dashed border-slate-100 dark:border-slate-800/50 last:border-b-0"
                        />
                      ))}
                    </div>

                    {/* Blocs de cours positionnés proportionnellement */}
                    {dayCourses.map((course) => {
                      const { top, height } = calculatePosition(
                        course.startTime,
                        course.endTime
                      );

                      return (
                        <div
                          key={course.id}
                          style={{ top, height }}
                          onMouseEnter={() => setHoveredCourse(course)}
                          onMouseLeave={() => setHoveredCourse(null)}
                          className={cn(
                            "absolute left-1 right-1 rounded-lg px-2 py-1.5 border shadow-2xs transition-all duration-150 cursor-pointer overflow-hidden z-10 hover:z-20 hover:shadow-md flex flex-col justify-between",
                            course.colorClass.bg,
                            course.colorClass.border,
                            course.colorClass.text
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold leading-tight truncate">
                              {course.courseName}
                            </p>
                            <p className="text-[10px] font-medium opacity-85 truncate">
                              {course.startTime} – {course.endTime}
                            </p>
                          </div>

                          {(course.room || course.professor) && (
                            <div className="flex items-center gap-1 text-[10px] font-semibold opacity-90 truncate">
                              {course.room ? (
                                <>
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{course.room}</span>
                                </>
                              ) : (
                                <>
                                  <User className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{course.professor}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
