import { NextRequest, NextResponse } from "next/server"
import { requireUser, isSupabaseConfigured } from "@/lib/supabase/server"
import { getDevStore } from "@/lib/supabase/dev-store"
import { parseScheduleWithGemini } from "@/lib/gemini/parse-schedule"
import type { ApiResponse, ParseScheduleResponse } from "@/types/api"
import type { ScheduleEntry } from "@/types/database"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
])

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ParseScheduleResponse>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json<ApiResponse<ParseScheduleResponse>>(
        {
          success: false,
          error: "Requête invalide : format multipart/form-data attendu",
        },
        { status: 400 }
      )
    }

    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return NextResponse.json<ApiResponse<ParseScheduleResponse>>(
        {
          success: false,
          error: "Aucun fichier fourni dans le champ 'file'",
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<ApiResponse<ParseScheduleResponse>>(
        {
          success: false,
          error: "Le fichier dépasse la taille maximale autorisée de 10 Mo",
        },
        { status: 413 }
      )
    }

    const mimeType = file.type || "image/png"
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json<ApiResponse<ParseScheduleResponse>>(
        {
          success: false,
          error: `Type de fichier non supporté (${mimeType}). Formats acceptés : JPEG, PNG, WebP, PDF.`,
        },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let parsedEntries
    try {
      parsedEntries = await parseScheduleWithGemini(buffer, mimeType)
    } catch (aiErr: unknown) {
      const message =
        aiErr instanceof Error ? aiErr.message : "Échec de l'analyse IA de l'emploi du temps"
      return NextResponse.json<ApiResponse<ParseScheduleResponse>>(
        {
          success: false,
          error: message,
        },
        { status: 502 }
      )
    }

    if (isSupabaseConfigured() && supabase) {
      // 1. Sauvegarde optionnelle dans le bucket Storage privé `schedules`
      const storagePath = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      await supabase.storage.from("schedules").upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

      // 2. Insertion des cours dans la table `schedule_entries`
      if (parsedEntries.length > 0) {
        const rowsToInsert = parsedEntries.map((item) => ({
          user_id: user.id,
          subject: item.subject,
          day_of_week: item.day_of_week,
          start_time: item.start_time,
          end_time: item.end_time,
          room: item.room,
        }))

        const { error: insertError } = await supabase
          .from("schedule_entries")
          .insert(rowsToInsert)

        if (insertError) {
          return NextResponse.json<ApiResponse<ParseScheduleResponse>>(
            {
              success: false,
              error: `Erreur lors de l'enregistrement des cours en base : ${insertError.message}`,
            },
            { status: 500 }
          )
        }
      }
    } else {
      // Mode simulation / dev store
      const devStore = getDevStore()
      const newEntries: ScheduleEntry[] = parsedEntries.map((item) => ({
        id: crypto.randomUUID(),
        user_id: user.id,
        subject: item.subject,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        room: item.room,
        created_at: new Date().toISOString(),
      }))
      // On remplace ou fusionne les entrées
      devStore.scheduleEntries = [...newEntries]
    }

    return NextResponse.json<ApiResponse<ParseScheduleResponse>>(
      {
        success: true,
        data: {
          entries: parsedEntries,
          saved_count: parsedEntries.length,
        },
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur"
    return NextResponse.json<ApiResponse<ParseScheduleResponse>>(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
