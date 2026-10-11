import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/supabase/server"
import type { ApiResponse } from "@/types/api"
import type { Document } from "@/types/database"
import { mockUserDocuments } from "@/lib/mocks/documents"

// In-memory fallback store for local development without active user session
let localDocumentsStore: Document[] = [...mockUserDocuments]

const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis").max(200),
  file_url: z.string().url("URL de fichier invalide").or(z.string().min(1)),
  subject_id: z.string().uuid().nullable().optional(),
})

export async function GET(): Promise<NextResponse<ApiResponse<Document[]>>> {
  try {
    const auth = await requireUser()

    if (!auth.error && auth.user) {
      const { data, error } = await auth.supabase
        .from("documents")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })

      if (error) {
        return NextResponse.json(
          { success: false, error: "Erreur lors de la récupération des documents", details: error.message },
          { status: 500 }
        )
      }

      // If user has no documents yet in Supabase, return local sample courses as starting material
      const docs = data && data.length > 0 ? (data as Document[]) : localDocumentsStore

      return NextResponse.json({
        success: true,
        data: docs,
      })
    }

    return NextResponse.json({
      success: true,
      data: localDocumentsStore,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: "Erreur inattendue",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<Document>>> {
  try {
    const body = await req.json()
    const parsed = createDocumentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Données de document invalides",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { title, file_url, subject_id } = parsed.data
    const auth = await requireUser()

    if (!auth.error && auth.user) {
      const { data, error } = await auth.supabase
        .from("documents")
        .insert({
          user_id: auth.user.id,
          title,
          file_url,
          subject_id: subject_id || null,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: "Échec de l'enregistrement du document", details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          data: data as Document,
        },
        { status: 201 }
      )
    }

    // Fallback store
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      user_id: "00000000-0000-0000-0000-000000000000",
      title,
      file_url,
      subject_id: subject_id || null,
      created_at: new Date().toISOString(),
    }
    localDocumentsStore.unshift(newDoc)

    return NextResponse.json(
      {
        success: true,
        data: newDoc,
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

export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Paramètre id manquant" },
        { status: 400 }
      )
    }

    const auth = await requireUser()

    if (!auth.error && auth.user) {
      const { error } = await auth.supabase
        .from("documents")
        .delete()
        .eq("id", id)
        .eq("user_id", auth.user.id)

      if (error) {
        return NextResponse.json(
          { success: false, error: "Erreur lors de la suppression", details: error.message },
          { status: 500 }
        )
      }
    }

    localDocumentsStore = localDocumentsStore.filter((d) => d.id !== id)

    return NextResponse.json({
      success: true,
      data: { deleted: true },
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
