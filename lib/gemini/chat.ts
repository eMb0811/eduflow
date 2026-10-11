import { getGeminiClient, getGeminiModelName } from "@/lib/gemini/client"
import type { Profile } from "@/types/database"

export interface ChatMessageInput {
  role: "user" | "assistant" | "system"
  content: string
}

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

export function buildSystemPrompt(profile?: Profile | null): string {
  const level = profile?.academic_level || "Licence / Université"
  const field = profile?.field_of_study || "Générale"
  const goals = profile?.academic_goals || "Réussir son année académique avec mention"

  return `Tu es l'assistant pédagogique et tuteur d'études intelligent d'EduFlow, conçu pour accompagner les étudiants universitaires.

Profil de l'étudiant :
- Niveau d'études : ${level}
- Filière : ${field}
- Objectifs académiques : ${goals}

Règles de communication et de formatage :
1. Rigueur pédagogique : Réponds avec clarté, pertinence et précision académique. Illustre par des exemples concrets ou des analogies mnémotechniques adaptées au niveau de l'étudiant.
2. Formules mathématiques et scientifiques : Utilise TOUJOURS la syntaxe LaTeX/KaTeX :
   - En ligne : entre simples dollars $E = mc^2$ ou $O(n \\log n)$.
   - En bloc centré : entre doubles dollars :
     $$f(x) = \\int_{-\\infty}^{\\infty} e^{-t^2} dt$$
3. Code informatique : Formate systématiquement le code dans des blocs Markdown avec le langage spécifié (ex: \`\`\`python, \`\`\`javascript, \`\`\`c).
4. Structuration : Utilise des titres Markdown (\`###\`), des listes à puces et du gras pour faciliter la lecture rapide.
5. Bienveillance et motivation : Encourage l'effort, la curiosité intellectuelle et la méthode de travail.`
}

/**
 * Creates an asynchronous stream of response chunks from Gemini 3.8 Flash.
 */
export async function createChatCompletionStream(
  messages: ChatMessageInput[],
  profile?: Profile | null
): Promise<AsyncIterable<{ text?: string }>> {
  const ai = getGeminiClient()
  const model = getGeminiModelName()

  // Format messages into Gemini contents format
  const contents = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

  const systemInstruction = buildSystemPrompt(profile)

  const stream = await callWithBackoff(() =>
    ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    })
  )

  return stream
}
