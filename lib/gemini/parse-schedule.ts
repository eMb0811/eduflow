import { z } from "zod"
import { getGeminiClient, getGeminiModelName } from "@/lib/gemini/client"
import type { ScheduleParsedItem } from "@/types/api"

export const scheduleParsedItemSchema = z.object({
  subject: z.string().trim().min(1, "Le nom de la matière est requis"),
  day_of_week: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format d'heure de début invalide (HH:mm 24h attendu)"),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format d'heure de fin invalide (HH:mm 24h attendu)"),
  room: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
})

export const parseScheduleResponseSchema = z.object({
  entries: z.array(scheduleParsedItemSchema),
})

const SYSTEM_PROMPT = `Tu es un assistant universitaire expert en reconnaissance et extraction d'emplois du temps (OCR visuel).
Analyse minutieusement cette image ou ce document PDF d'emploi du temps et extrait chaque cours/séance visible.

Règles impératives de normalisation :
1. "subject" : nom clair et complet de la matière ou du module (ex: "Algorithmique avancée", "Analyse numérique").
2. "day_of_week" : obligatoirement l'un de ces 7 identifiants en anglais minuscule :
   "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday".
3. "start_time" : heure de début au format strict 24h "HH:mm" (ex: "08:30", "14:00").
4. "end_time" : heure de fin au format strict 24h "HH:mm" (ex: "10:30", "16:00").
5. "room" : numéro ou nom de salle/amphithéâtre si lisible, sinon null.
6. Ne JAMAIS inventer un cours qui n'apparaît pas clairement dans l'emploi du temps.
7. Ne renvoie rien d'autre qu'un objet JSON strict respectant la structure suivante :
{
  "entries": [
    {
      "subject": "Nom de la matière",
      "day_of_week": "monday",
      "start_time": "08:00",
      "end_time": "10:00",
      "room": "Amphi B"
    }
  ]
}`

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
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000))
        continue
      }
      throw err
    }
  }
  throw new Error("Maximum retry attempts reached")
}

/**
 * Parses schedule document/image using Gemini Vision with strict Zod validation and 1 retry.
 */
export async function parseScheduleWithGemini(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ScheduleParsedItem[]> {
  const ai = getGeminiClient()
  const model = getGeminiModelName()
  const base64Data = fileBuffer.toString("base64")

  const parts = [
    { inlineData: { mimeType, data: base64Data } },
    { text: "Extrais tous les créneaux de cours de cet emploi du temps au format JSON strict." },
  ]

  // Premier essai avec backoff sur 503/429
  const firstResponse = await callWithBackoff(() =>
    ai.models.generateContent({
      model,
      contents: [{ parts }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    })
  )

  const firstRawText = firstResponse.text || ""

  try {
    const parsedJson = JSON.parse(firstRawText)
    const validated = parseScheduleResponseSchema.parse(parsedJson)
    return validated.entries
  } catch (firstError) {
    const errorMessage =
      firstError instanceof Error ? firstError.message : "Erreur de validation JSON/Zod"

    // Retry unique avec l'erreur Zod ajoutée au prompt (spécification PRD/Backend)
    try {
      const retryResponse = await callWithBackoff(() =>
        ai.models.generateContent({
          model,
          contents: [
            {
              parts: [
                ...parts,
                {
                  text: `La réponse précédente était invalide : ${errorMessage}.\nTexte brut reçu :\n${firstRawText}\n\nCorrige impérativement le JSON pour respecter scrupuleusement le schéma demandé.`,
                },
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
          },
        })
      )

      const retryRawText = retryResponse.text || ""
      const retryParsedJson = JSON.parse(retryRawText)
      const validatedRetry = parseScheduleResponseSchema.parse(retryParsedJson)
      return validatedRetry.entries
    } catch (secondError) {
      throw new Error(
        `Réponse IA invalide après nouvelle tentative : ${
          secondError instanceof Error ? secondError.message : "Structure JSON incorrecte"
        }`
      )
    }
  }
}
