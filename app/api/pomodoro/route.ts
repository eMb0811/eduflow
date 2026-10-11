import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types/api"
import type { PomodoroSession } from "@/types/database"

// Fallback in-memory store for local dev
const localPomodoroSessions: PomodoroSession[] = [
  {
    id: "session-mock-1",
    user_id: "00000000-0000-0000-0000-000000000000",
    duration_minutes: 25,
    type: "work",
    completed_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
    created_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
  },
  {
    id: "session-mock-2",
    user_id: "00000000-0000-0000-0000-000000000000",
    duration_minutes: 25,
    type: "work",
    completed_at: new Date(Date.now() - 3600_000 * 4).toISOString(),
    created_at: new Date(Date.now() - 3600_000 * 4).toISOString(),
  },
]

const sessionInputSchema = z.object({
  duration_minutes: z.number().int().positive("La durée doit être supérieure à 0"),
  type: z.enum(["work", "short_break", "long_break"]),
  completed_at: z.string().optional(),
})

export async function GET(): Promise<NextResponse<ApiResponse<PomodoroSession[]>>> {
  try {
    const auth = await requireUser()

    if (!auth.error && auth.user) {
      const { data, error } = await auth.supabase
        .from("pomodoro_sessions")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("completed_at", { ascending: false })
        .limit(50)

      if (error) {
        return NextResponse.json(
          { success: false, error: "Erreur lors de la récupération des sessions", details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: (data || []) as PomodoroSession[],
      })
    }

    return NextResponse.json({
      success: true,
      data: localPomodoroSessions,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<PomodoroSession>>> {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Corps de requête JSON manquant ou invalide" },
        { status: 400 }
      )
    }

    const validation = sessionInputSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Paramètres de session invalides",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { duration_minutes, type, completed_at } = validation.data
    const timestamp = completed_at || new Date().toISOString()
    const auth = await requireUser()

    if (!auth.error && auth.user) {
      const { data, error } = await auth.supabase
        .from("pomodoro_sessions")
        .insert({
          user_id: auth.user.id,
          duration_minutes,
          type,
          completed_at: timestamp,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: "Échec de l'enregistrement de la session", details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          data: data as PomodoroSession,
        },
        { status: 201 }
      )
    }

    // Local fallback store
    const fallbackSession: PomodoroSession = {
      id: `session-${Date.now()}`,
      user_id: "00000000-0000-0000-0000-000000000000",
      duration_minutes,
      type,
      completed_at: timestamp,
      created_at: timestamp,
    }
    localPomodoroSessions.unshift(fallbackSession)

    return NextResponse.json(
      {
        success: true,
        data: fallbackSession,
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: "Erreur serveur",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
