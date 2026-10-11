import { z } from "zod"
import { getGeminiClient, getGeminiModelName } from "@/lib/gemini/client"
import type { QuizResponse } from "@/types/api"

export const quizQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(1, "La question est requise"),
  options: z
    .array(z.string().trim().min(1, "Option non vide"))
    .length(4, "Chaque question doit comporter exactement 4 options"),
  correct_option_index: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1, "Une explication est requise"),
})

export const quizResponseSchema = z.object({
  title: z.string().trim().min(1, "Le titre du quiz est requis"),
  questions: z.array(quizQuestionSchema).min(1, "Au moins une question est requise"),
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

const SYSTEM_PROMPT = `Tu es un examinateur universitaire réputé pour la précision et la pertinence de ses évaluations formatives.
Ta mission est de créer un QCM interactif (Quiz) pour tester la compréhension profonde d'un étudiant à partir de son cours.

Critères d'excellence pour le QCM :
1. Questions stimulantes : tester la compréhension conceptuelle, la logique et l'application plutôt que la simple récitation textuelle.
2. Exactement 4 choix de réponse par question (A, B, C, D) :
   - 1 seule réponse incontestablement correcte (indiquée par son index 0, 1, 2 ou 3 dans "correct_option_index").
   - 3 distracteurs réalistes, crédibles et basés sur des erreurs de raisonnement fréquentes des étudiants.
3. Explication claire et didactique ("explanation") : détaillant pourquoi la réponse exacte est correcte et dissipant les pièges des fausses propositions.
4. Format de sortie : Réponds STRICTEMENT par un objet JSON conforme au schéma :
{
  "title": "Titre du Quiz",
  "questions": [
    {
      "id": "q-1",
      "question": "Énoncé de la question...",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct_option_index": 1,
      "explanation": "Explication pédagogique..."
    }
  ]
}`

export interface GenerateQuizParams {
  text: string
  count?: number
  difficulty?: "facile" | "moyen" | "difficile"
  topicHint?: string
}

export async function generateQuizWithGemini({
  text,
  count = 5,
  difficulty = "moyen",
  topicHint,
}: GenerateQuizParams): Promise<QuizResponse> {
  const ai = getGeminiClient()
  const model = getGeminiModelName()

  const userPrompt = `Voici le support de cours pour concevoir un QCM de ${count} questions (Niveau : ${difficulty}) :
${topicHint ? `Thème / Matière : ${topicHint}\n` : ""}
---
${text.slice(0, 30000)}
---

Génère le quiz complet au format JSON strict :
{
  "title": "Quiz - Titre",
  "questions": [
    {
      "id": "q-1",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_option_index": 0,
      "explanation": "..."
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
    const validated = quizResponseSchema.parse(parsed)
    return {
      title: validated.title,
      questions: validated.questions.map((q, idx) => ({
        ...q,
        id: q.id || `q-${idx + 1}`,
      })),
    }
  } catch (firstError) {
    // Retry once with error injection
    const retryPrompt = `${userPrompt}

ATTENTION : La réponse précédente a échoué avec l'erreur :
${firstError instanceof Error ? firstError.message : String(firstError)}

Corrige scrupuleusement la structure (exactement 4 options, correct_option_index entre 0 et 3) et renvoie UNIQUEMENT le JSON valide.`

    try {
      const retryRaw = await callWithBackoff(() => executeRequest(retryPrompt))
      const retryParsed = JSON.parse(retryRaw)
      const validated = quizResponseSchema.parse(retryParsed)
      return {
        title: validated.title,
        questions: validated.questions.map((q, idx) => ({
          ...q,
          id: q.id || `q-${idx + 1}`,
        })),
      }
    } catch (retryError) {
      throw new Error(
        `Réponse JSON de l'IA invalide pour le quiz : ${retryError instanceof Error ? retryError.message : String(retryError)}`
      )
    }
  }
}
