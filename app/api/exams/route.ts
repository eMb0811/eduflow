import { NextResponse } from "next/server"
import { requireUser, isSupabaseConfigured } from "@/lib/supabase/server"
import { getDevStore } from "@/lib/supabase/dev-store"
import type { ApiResponse } from "@/types/api"
import type { Exam } from "@/types/database"

export interface UpcomingExamItem extends Exam {
  subject: string
}

export async function GET(): Promise<NextResponse<ApiResponse<UpcomingExamItem[]>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from("exams")
        .select("*, subjects(name)")
        .eq("user_id", user.id)
        .order("exam_date", { ascending: true })

      if (error) {
        return NextResponse.json<ApiResponse<UpcomingExamItem[]>>(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        )
      }

      type ExamWithSubjectRelation = Exam & {
        subjects?: { name: string } | null
      }

      const rows = (data || []) as unknown as ExamWithSubjectRelation[]
      const formatted: UpcomingExamItem[] = rows.map((e) => ({
        id: e.id,
        user_id: e.user_id,
        subject_id: e.subject_id,
        title: e.title,
        exam_date: e.exam_date,
        created_at: e.created_at,
        subject: e.subjects?.name || e.title,
      }))

      // Si pas encore d'examen, générer un exemple de test
      if (formatted.length === 0) {
        const now = Date.now()
        const defaults: UpcomingExamItem[] = [
          {
            id: "default-exam-1",
            user_id: user.id,
            subject_id: null,
            title: "Partiel Algorithmique I",
            exam_date: new Date(now + 4 * 86_400_000).toISOString(),
            created_at: new Date().toISOString(),
            subject: "Algorithmique I",
          },
          {
            id: "default-exam-2",
            user_id: user.id,
            subject_id: null,
            title: "Examen Systèmes d'Exploitation",
            exam_date: new Date(now + 11 * 86_400_000).toISOString(),
            created_at: new Date().toISOString(),
            subject: "Systèmes d'Exploitation",
          },
        ]
        return NextResponse.json<ApiResponse<UpcomingExamItem[]>>(
          {
            success: true,
            data: defaults,
          },
          { status: 200 }
        )
      }

      return NextResponse.json<ApiResponse<UpcomingExamItem[]>>(
        {
          success: true,
          data: formatted,
        },
        { status: 200 }
      )
    }

    // Dev store fallback
    const devExams = getDevStore().exams.map((e) => ({
      ...e,
      subject: e.title.replace("Partiel ", "").replace("Examen ", ""),
    }))

    return NextResponse.json<ApiResponse<UpcomingExamItem[]>>(
      {
        success: true,
        data: devExams,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur"
    return NextResponse.json<ApiResponse<UpcomingExamItem[]>>(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
