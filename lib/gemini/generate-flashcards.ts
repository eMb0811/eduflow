import { z } from "zod"
import { getGeminiClient, getGeminiModelName } from "@/lib/gemini/client"
import type { Flashcard } from "@/types/api"

export const flashcardItemSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(1, "La question est requise"),
  answer: z.string().trim().min(1, "La réponse est requise"),
  category: z.string().trim().optional(),
})

export const flashcardsResponseSchema = z.object({
  flashcards: z.array(flashcardItemSchema).min(1, "Au moins une flashcard est requise"),
})

async function callWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      return await fn()
    } catch (err: unknown) {
      attempt++
      const message = err instanceof Error ? err.message : String(err)
      const isTransient =
        message.includes("503") || message.includes("429") || message.includes("UNAVAILABLE")
      if (isTransient && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500))
        continue
      }
      throw err
    }
  }
  throw new Error("Nombre maximal de tentatives atteint")
}

const SYSTEM_PROMPT = `Tu es un expert en sciences cognitives, répétition espacée (spaced repetition) et mémorisation active (active recall).
Ta mission est de concevoir des fiches de révision (Flashcards) percutantes et ciblées à partir d'un cours universitaire.

Principes de qualité pour chaque carte :
1. Une question atomique : testant UNE seule idée, définition, formule, ou mécanisme à la fois.
2. Une réponse claire et concise : formulée pour faciliter l'auto-évaluation immédiate de l'étudiant.
3. Évite les questions floues ou ouvertes : favorise les questions directes (« Quelle est la différence entre... ? », « Définir le principe de... », « Quel est le rôle de... ? »).
4. Catégorisation : associe une sous-notion ou catégorie pour structurer l'apprentissage.
5. Format de sortie : Réponds UNIQUEMENT par un objet JSON respectant le format :
{
  "flashcards": [
    {
      "id": "card-1",
      "question": "Question précise...",
      "answer": "Réponse concise et exacte...",
      "category": "Nom de la notion"
    }
  ]
}`

export interface GenerateFlashcardsParams {
  text: string
  count?: number
  subjectHint?: string
}

export async function generateFlashcardsWithGemini({
  text,
  count = 8,
  subjectHint,
}: GenerateFlashcardsParams): Promise<Flashcard[]> {
  const ai = getGeminiClient()
  const model = getGeminiModelName()

  const userPrompt = `Voici le texte du cours pour lequel créer exactement ${count} flashcards de révision active :
${subjectHint ? `Matière / Thème : ${subjectHint}\n` : ""}
---
${text.slice(0, 30000)}
---

Génère ${count} flashcards de haute valeur pédagogique au format JSON strict :
{
  "flashcards": [
    {
      "id": "1",
      "question": "...",
      "answer": "...",
      "category": "..."
    }
  ]
}`

  async function executeRequest(promptText: string) {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    })
    return response.text?.trim() || ""
  }

  let rawJson = ""
  try {
    rawJson = await callWithBackoff(() => executeRequest(userPrompt))
  } catch (apiError) {
    throw new Error(
      `Échec de connexion à l'API Gemini : ${apiError instanceof Error ? apiError.message : String(apiError)}`
    )
  }

  try {
    const parsed = JSON.parse(rawJson)
    const validated = flashcardsResponseSchema.parse(parsed)
    return validated.flashcards.map((card, idx) => ({
      ...card,
      id: card.id || `card-${idx + 1}`,
    }))
  } catch (firstError) {
    // Retry once with error injection
    const retryPrompt = `${userPrompt}

ATTENTION : La réponse précédente a échoué avec l'erreur :
${firstError instanceof Error ? firstError.message : String(firstError)}

Corrige scrupuleusement la structure et renvoie UNIQUEMENT le JSON conforme.`

    try {
      const retryRaw = await callWithBackoff(() => executeRequest(retryPrompt))
      const retryParsed = JSON.parse(retryRaw)
      const validated = flashcardsResponseSchema.parse(retryParsed)
      return validated.flashcards.map((card, idx) => ({
        ...card,
        id: card.id || `card-${idx + 1}`,
      }))
    } catch (retryError) {
      throw new Error(
        `Réponse JSON de l'IA invalide pour les flashcards : ${retryError instanceof Error ? retryError.message : String(retryError)}`
      )
    }
  }
}
