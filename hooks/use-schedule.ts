"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { DayOfWeek, ScheduleEntry } from "@/types/database"
import type { GeneratePlanningResponse, ParseScheduleResponse } from "@/types/api"
import { apiFetch, type ApiError } from "@/hooks/api-client"
import type { UpcomingExam } from "@/lib/mocks"

export const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "monday", label: "Lundi", short: "Lun" },
  { key: "tuesday", label: "Mardi", short: "Mar" },
  { key: "wednesday", label: "Mercredi", short: "Mer" },
  { key: "thursday", label: "Jeudi", short: "Jeu" },
  { key: "friday", label: "Vendredi", short: "Ven" },
  { key: "saturday", label: "Samedi", short: "Sam" },
  { key: "sunday", label: "Dimanche", short: "Dim" },
]

/** JS getDay() (0 = Sunday) → DayOfWeek. */
export function dayOfWeekFromDate(date: Date): DayOfWeek {
  return DAYS[(date.getDay() + 6) % 7].key
}

export const scheduleKey = ["schedule"] as const

/** GET /api/schedule — récupère les cours réels de l'utilisateur. */
export function useSchedule() {
  return useQuery<ScheduleEntry[], ApiError>({
    queryKey: scheduleKey,
    queryFn: () => apiFetch<ScheduleEntry[]>("/api/schedule"),
  })
}

/** POST /api/schedule/parse — analyse le fichier via Gemini Vision et enregistre les cours. */
export function useParseSchedule() {
  const queryClient = useQueryClient()
  return useMutation<ParseScheduleResponse, ApiError, File>({
    mutationFn: (file) => {
      const body = new FormData()
      body.append("file", file)
      return apiFetch<ParseScheduleResponse>("/api/schedule/parse", { method: "POST", body })
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: scheduleKey })
      toast.success(`${result.saved_count} cours importés`, {
        description: "Ton emploi du temps a été mis à jour.",
      })
    },
    onError: (error) => {
      toast.error("Échec de l'analyse du fichier", { description: error.message })
    },
  })
}

/** POST /api/schedule/generate-planning — génère le planning de révision IA pour la journée. */
export function useTodayPlanning(day: DayOfWeek) {
  return useQuery<GeneratePlanningResponse, ApiError>({
    queryKey: ["planning", day],
    queryFn: () =>
      apiFetch<GeneratePlanningResponse>("/api/schedule/generate-planning", {
        method: "POST",
        body: JSON.stringify({ day_of_week: day }),
      }),
  })
}

/** Mutation pour régénérer le planning de révision via Gemini. */
export function useRegeneratePlanning() {
  const queryClient = useQueryClient()
  return useMutation<GeneratePlanningResponse, ApiError, DayOfWeek>({
    mutationFn: (day) =>
      apiFetch<GeneratePlanningResponse>("/api/schedule/generate-planning", {
        method: "POST",
        body: JSON.stringify({ day_of_week: day }),
      }),
    onSuccess: (data, day) => {
      queryClient.setQueryData(["planning", day], data)
      void queryClient.invalidateQueries({ queryKey: ["planning"] })
      toast.success("Planning régénéré avec succès", {
        description: `${data.slots.length} créneaux optimisés par Gemini.`,
      })
    },
    onError: (error) => {
      toast.error("Impossible de régénérer le planning", {
        description: error.message,
      })
    },
  })
}

/** GET /api/exams — liste des prochains examens. */
export function useUpcomingExams() {
  return useQuery<UpcomingExam[], ApiError>({
    queryKey: ["exams", "upcoming"],
    queryFn: () => apiFetch<UpcomingExam[]>("/api/exams?upcoming=true"),
  })
}

/** "08:30" → minutes since midnight. */
export function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + (m || 0)
}

/** Stable, pleasant color per subject name. */
const SUBJECT_HUES = [278, 190, 340, 155, 70, 230, 20, 305]
export function subjectHue(subject: string) {
  let hash = 0
  for (let i = 0; i < subject.length; i++) hash = (hash * 31 + subject.charCodeAt(i)) >>> 0
  return SUBJECT_HUES[hash % SUBJECT_HUES.length]
}
