import { z } from "zod"
import { getGeminiClient, getGeminiModelName } from "@/lib/gemini/client"
import type { DocumentSummary } from "@/types/api"

export const documentSummarySchema = z.object({
  title: z.string().trim().min(1, "Titre requis"),
  overview: z.string().trim().min(1, "Vue d'ensemble requise"),
  key_concepts: z
    .array(
      z.object({
        concept: z.string().trim().min(1, "Nom du concept requis"),
        explanation: z.string().trim().min(1, "Explication du concept requise"),
      })
    )
    .min(1, "Au moins un concept clé est requis"),
  detailed_summary: z.string().trim().min(1, "Résumé détaillé requis"),
  key_takeaways: z.array(z.string().trim().min(1)).min(1, "Au moins un point à retenir est requis"),
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

const SYSTEM_PROMPT = `Tu es un professeur d'université d'élite et chercheur pédagogique.
Ta mission est de créer une synthèse d'étude claire, rigoureuse et mémorable à partir du contenu de cours fourni par un étudiant.

Règles de génération :
1. Reste fidèle au contenu transmis : ne fabrique aucune information non étayée par le cours.
2. Structure la synthèse :
   - "title" : Titre clair et précis du cours ou du chapitre.
   - "overview" : Résumé exécutif en 2-3 phrases définissant l'enjeu du sujet.
   - "key_concepts" : Liste des notions ou définitions fondamentales avec leur explication claire.
   - "detailed_summary" : Synthèse approfondie et structurée (en Markdown avec listes et sous-parties si pertinent).
   - "key_takeaways" : 3 à 5 points essentiels que l'étudiant doit impérativement retenir pour son examen.
3. Langue : Français soigné, pédagogique et concis.
4. Format de sortie : Réponds UNIQUEMENT par un objet JSON valide conforme au schéma.`

export interface SummarizeDocumentParams {
  text: string
  titleHint?: string
}

export async function summarizeDocumentWithGemini({
  text,
  titleHint,
}: SummarizeDocumentParams): Promise<DocumentSummary> {
  const ai = getGeminiClient()
  const model = getGeminiModelName()

  const userPrompt = `Voici le texte du cours à analyser et synthétiser :
${titleHint ? `Titre suggéré : ${titleHint}\n` : ""}
---
${text.slice(0, 30000)}
---

Génère la synthèse d'étude complète au format JSON strict :
{
  "title": "Titre du sujet",
  "overview": "Brève vue d'ensemble...",
  "key_concepts": [
    { "concept": "Nom du concept", "explanation": "Définition précise..." }
  ],
  "detailed_summary": "Synthèse détaillée du cours...",
  "key_takeaways": [
    "Point clé 1",
    "Point clé 2"
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
        temperature: 0.2,
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
    return documentSummarySchema.parse(parsed)
  } catch (firstError) {
    // Retry once with error injection
    const retryPrompt = `${userPrompt}

ATTENTION : La réponse précédente a échoué avec l'erreur :
${firstError instanceof Error ? firstError.message : String(firstError)}

Corrige scrupuleusement la structure et renvoie UNIQUEMENT le JSON valide correspondant au schéma.`

    try {
      const retryRaw = await callWithBackoff(() => executeRequest(retryPrompt))
      const retryParsed = JSON.parse(retryRaw)
      return documentSummarySchema.parse(retryParsed)
    } catch (retryError) {
      throw new Error(
        `Réponse JSON de l'IA invalide après retry : ${retryError instanceof Error ? retryError.message : String(retryError)}`
      )
    }
  }
}
