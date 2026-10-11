import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { summarizeDocumentWithGemini } from "@/lib/gemini/summarize-document"
import type { ApiResponse, SummarizeDocumentResponse } from "@/types/api"

const summarizeRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(20, "Le texte du cours doit comporter au moins 20 caractères pour être résumé."),
  titleHint: z.string().trim().optional(),
})

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<SummarizeDocumentResponse>>> {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Corps de requête JSON manquant ou invalide" },
        { status: 400 }
      )
    }

    const validation = summarizeRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Requête invalide",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { text, titleHint } = validation.data

    const summary = await summarizeDocumentWithGemini({
      text,
      titleHint,
    })

    return NextResponse.json({
      success: true,
      data: { summary },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const isGeminiError = message.includes("Gemini") || message.includes("IA")

    return NextResponse.json(
      {
        success: false,
        error: isGeminiError ? "Échec de la génération du résumé par l'IA" : "Erreur serveur",
        details: message,
      },
      { status: isGeminiError ? 502 : 500 }
    )
  }
}
