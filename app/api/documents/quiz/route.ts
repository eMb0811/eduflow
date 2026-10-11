import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateQuizWithGemini } from "@/lib/gemini/generate-quiz"
import type { ApiResponse, QuizResponse } from "@/types/api"

const quizRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(20, "Le texte du cours doit comporter au moins 20 caractères pour générer un quiz."),
  count: z.number().int().min(1).max(15).optional().default(5),
  difficulty: z.enum(["facile", "moyen", "difficile"]).optional().default("moyen"),
  topicHint: z.string().trim().optional(),
})

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<QuizResponse>>> {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Corps de requête JSON manquant ou invalide" },
        { status: 400 }
      )
    }

    const validation = quizRequestSchema.safeParse(body)
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

    const { text, count, difficulty, topicHint } = validation.data

    const quiz = await generateQuizWithGemini({
      text,
      count,
      difficulty,
      topicHint,
    })

    return NextResponse.json({
      success: true,
      data: quiz,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const isGeminiError = message.includes("Gemini") || message.includes("IA")

    return NextResponse.json(
      {
        success: false,
        error: isGeminiError ? "Échec de la génération du quiz par l'IA" : "Erreur serveur",
        details: message,
      },
      { status: isGeminiError ? 502 : 500 }
    )
  }
}
