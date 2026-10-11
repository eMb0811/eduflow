import { GoogleGenAI } from '@google/genai'

let geminiClientInstance: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  if (geminiClientInstance) {
    return geminiClientInstance
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not defined')
  }

  geminiClientInstance = new GoogleGenAI({ apiKey })
  return geminiClientInstance
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash'
}
