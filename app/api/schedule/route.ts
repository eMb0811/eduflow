import { NextResponse } from "next/server"
import { requireUser, isSupabaseConfigured } from "@/lib/supabase/server"
import { getDevStore } from "@/lib/supabase/dev-store"
import type { ApiResponse } from "@/types/api"
import type { ScheduleEntry } from "@/types/database"

export async function GET(): Promise<NextResponse<ApiResponse<ScheduleEntry[]>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: true })

      if (error) {
        return NextResponse.json<ApiResponse<ScheduleEntry[]>>(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        )
      }

      if (data && data.length > 0) {
        return NextResponse.json<ApiResponse<ScheduleEntry[]>>(
          {
            success: true,
            data,
          },
          { status: 200 }
        )
      }
    }

    // Dev store fallback
    const entries = getDevStore().scheduleEntries
    return NextResponse.json<ApiResponse<ScheduleEntry[]>>(
      {
        success: true,
        data: entries,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur"
    return NextResponse.json<ApiResponse<ScheduleEntry[]>>(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

export async function DELETE(): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from("schedule_entries")
        .delete()
        .eq("user_id", user.id)

      if (error) {
        return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        )
      }
    } else {
      getDevStore().scheduleEntries = []
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
      {
        success: true,
        data: { deleted: true },
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur"
    return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
