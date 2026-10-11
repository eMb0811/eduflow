import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateFlashcardsWithGemini } from "@/lib/gemini/generate-flashcards"
import type { ApiResponse, FlashcardsResponse } from "@/types/api"

const flashcardsRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(20, "Le texte du cours doit comporter au moins 20 caractères pour générer des flashcards."),
  count: z.number().int().min(1).max(20).optional().default(8),
  subjectHint: z.string().trim().optional(),
})

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<FlashcardsResponse>>> {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Corps de requête JSON manquant ou invalide" },
        { status: 400 }
      )
    }

    const validation = flashcardsRequestSchema.safeParse(body)
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

    const { text, count, subjectHint } = validation.data

    const flashcards = await generateFlashcardsWithGemini({
      text,
      count,
      subjectHint,
    })

    return NextResponse.json({
      success: true,
      data: { flashcards },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const isGeminiError = message.includes("Gemini") || message.includes("IA")

    return NextResponse.json(
      {
        success: false,
        error: isGeminiError ? "Échec de la génération des flashcards par l'IA" : "Erreur serveur",
        details: message,
      },
      { status: isGeminiError ? 502 : 500 }
    )
  }
}
