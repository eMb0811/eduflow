import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser, isSupabaseConfigured } from "@/lib/supabase/server"
import { getDevStore } from "@/lib/supabase/dev-store"
import { mockRevisionSlots } from "@/lib/mocks"
import { generatePlanningWithGemini } from "@/lib/gemini/generate-planning"
import type { ApiResponse, GeneratePlanningResponse, RevisionSlot } from "@/types/api"
import type { DayOfWeek, ScheduleEntry, Exam, Profile } from "@/types/database"

const dayOfWeekSchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
])

const requestBodySchema = z
  .object({
    day_of_week: dayOfWeekSchema.optional(),
  })
  .optional()

function getFallbackDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ]
  return days[new Date().getDay()]
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GeneratePlanningResponse>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    let dayOfWeek: DayOfWeek = getFallbackDayOfWeek()

    try {
      const json = await request.json()
      const parsed = requestBodySchema.safeParse(json)
      if (parsed.success && parsed.data?.day_of_week) {
        dayOfWeek = parsed.data.day_of_week
      }
    } catch {
      // Body optionnel, fallback sur le jour actuel
    }

    let profile: Profile | null = null
    let courses: ScheduleEntry[] = []
    let exams: Exam[] = []

    if (isSupabaseConfigured() && supabase) {
      // 1. Profil étudiant
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()
      profile = profileData

      // 2. Cours de l'emploi du temps
      const { data: scheduleData } = await supabase
        .from("schedule_entries")
        .select("*")
        .eq("user_id", user.id)
      courses = scheduleData || []

      // 3. Examens à venir
      const { data: examsData } = await supabase
        .from("exams")
        .select("*")
        .eq("user_id", user.id)
        .order("exam_date", { ascending: true })
      exams = examsData || []
    } else {
      const devStore = getDevStore()
      profile = devStore.profile
      courses = devStore.scheduleEntries
      exams = devStore.exams
    }

    if (!profile) profile = getDevStore().profile
    if (courses.length === 0) courses = getDevStore().scheduleEntries
    if (exams.length === 0) exams = getDevStore().exams

    // Si aucun examen n'est encore enregistré, générer des objectifs basés sur les matières des cours
    if (exams.length === 0 && courses.length > 0) {
      const uniqueSubjects = Array.from(new Set(courses.map((c) => c.subject)))
      const now = Date.now()
      exams = uniqueSubjects.slice(0, 3).map((sub, idx) => ({
        id: `auto-exam-${idx}`,
        user_id: user.id,
        subject_id: null,
        title: `Examen final : ${sub}`,
        exam_date: new Date(now + (idx + 1) * 7 * 86_400_000).toISOString(),
        created_at: new Date().toISOString(),
      }))
    }

    let slots: RevisionSlot[]
    try {
      slots = await generatePlanningWithGemini({
        day_of_week: dayOfWeek,
        courses,
        exams,
        profile,
      })
    } catch (aiErr: unknown) {
      console.warn("Gemini planning failed, falling back to heuristic revision slots:", aiErr)
      slots = mockRevisionSlots(dayOfWeek)
    }

    return NextResponse.json<ApiResponse<GeneratePlanningResponse>>(
      {
        success: true,
        data: { slots },
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur"
    return NextResponse.json<ApiResponse<GeneratePlanningResponse>>(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
