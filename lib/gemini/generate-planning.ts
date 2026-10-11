import { z } from "zod"
import { getGeminiClient, getGeminiModelName } from "@/lib/gemini/client"
import type { DayOfWeek, ScheduleEntry, Exam, Profile } from "@/types/database"
import type { RevisionSlot } from "@/types/api"

export const revisionSlotSchema = z.object({
  subject: z.string().trim().min(1, "Le sujet est requis"),
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
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format d'heure invalide (HH:mm 24h attendu)"),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format d'heure invalide (HH:mm 24h attendu)"),
  activity: z.string().trim().min(1, "L'activité est requise"),
  tips: z.string().trim().optional(),
})

export const generatePlanningResponseSchema = z.object({
  slots: z.array(revisionSlotSchema),
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

const SYSTEM_PROMPT = `Tu es un tuteur pédagogique universitaire d'élite expert en organisation des études et optimisation cognitive.
Ta mission est de construire un planning quotidien de révision intelligent sur mesure pour un étudiant universitaire.

Règles impératives de cohérence :
1. ABSOLU RESPECT DES CRÉNEAUX DE COURS : Tu ne dois JAMAIS programmer une révision ou une pause pendant une heure où l'étudiant est déjà en cours ! Les révisions se placent UNIQUEMENT sur les créneaux libres (ex: après les cours en fin d'après-midi/soirée, ou lors des fenêtres libres en journée).
2. PRIORITÉ AUX EXAMENS : Priorise les matières dont les examens ou partiels approchent dans les jours/semaines à venir.
3. ÉQUILIBRE ET MÉTHODE : Alterne des sessions de travail ciblé (45 à 90 minutes) et des pauses régénératrices (15 à 30 minutes, identifiées avec subject "Pause").
4. FORMAT HORAIRE STRICT : "start_time" et "end_time" au format 24h "HH:mm" (ex: "17:00", "18:30").
5. Format de sortie : Réponds UNIQUEMENT avec un JSON strict respectant :
{
  "slots": [
    {
      "subject": "Nom de la matière ou 'Pause'",
      "day_of_week": "monday",
      "start_time": "17:00",
      "end_time": "18:15",
      "activity": "Exercices pratiques et révision des concepts clés",
      "tips": "Conseil méthodologique pertinent et motivant"
    }
  ]
}`

export interface GeneratePlanningParams {
  day_of_week: DayOfWeek
  courses: ScheduleEntry[]
  exams: Exam[]
  profile?: Profile | null
}

/**
 * Generates an intelligent study planning tailored to student courses and upcoming exams.
 */
export async function generatePlanningWithGemini({
  day_of_week,
  courses,
  exams,
  profile,
}: GeneratePlanningParams): Promise<RevisionSlot[]> {
  const ai = getGeminiClient()
  const model = getGeminiModelName()

  const coursesContext =
    courses.length > 0
      ? courses
          .filter((c) => c.day_of_week === day_of_week)
          .map((c) => `- ${c.start_time} à ${c.end_time} : ${c.subject} (${c.room || "Salle ND"})`)
          .join("\n")
      : "Aucun cours en présentiel prévu ce jour."

  const examsContext =
    exams.length > 0
      ? exams
          .map(
            (e) =>
              `- ${e.title} (date : ${new Date(e.exam_date).toLocaleDateString("fr-FR")})`
          )
          .join("\n")
      : "Aucun examen imminent enregistré."

  const studentContext = `
Profil étudiant :
- Niveau d'études : ${profile?.academic_level || "Licence / Université"}
- Filière : ${profile?.field_of_study || "Générale"}
- Objectifs : ${profile?.academic_goals || "Réussir son semestre avec mention"}

Jour concerné : ${day_of_week}

Cours de la journée (créneaux occupés à NE PAS CHEVAUCHER) :
${coursesContext}

Examens à préparer en priorité :
${examsContext}
`

  const contents = [
    {
      text: `${studentContext}\n\nGénère le planning de révision optimisé pour ce jour au format JSON strict.`,
    },
  ]

  const firstResponse = await callWithBackoff(() =>
    ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    })
  )

  const firstRawText = firstResponse.text || ""

  try {
    const parsedJson = JSON.parse(firstRawText)
    const validated = generatePlanningResponseSchema.parse(parsedJson)
    return validated.slots
  } catch (firstError) {
    const errorMessage =
      firstError instanceof Error ? firstError.message : "Erreur de validation JSON/Zod"

    try {
      const retryResponse = await callWithBackoff(() =>
        ai.models.generateContent({
          model,
          contents: [
            ...contents,
            {
              text: `La réponse précédente était invalide : ${errorMessage}.\nTexte brut reçu :\n${firstRawText}\n\nCorrige impérativement le JSON pour respecter scrupuleusement le schéma demandé.`,
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
      const validatedRetry = generatePlanningResponseSchema.parse(retryParsedJson)
      return validatedRetry.slots
    } catch (secondError) {
      throw new Error(
        `Réponse IA invalide après nouvelle tentative : ${
          secondError instanceof Error ? secondError.message : "Structure JSON incorrecte"
        }`
      )
    }
  }
}
