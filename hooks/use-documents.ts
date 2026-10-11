"use client"

import { useState, useCallback, useEffect } from "react"
import type { Document } from "@/types/database"
import type {
  ApiResponse,
  DocumentSummary,
  SummarizeDocumentResponse,
  Flashcard,
  FlashcardsResponse,
  QuizResponse,
} from "@/types/api"

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/documents")
      const json: ApiResponse<Document[]> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Impossible de charger les documents")
      }
      setDocuments(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    void (async () => {
      try {
        const res = await fetch("/api/documents")
        const json: ApiResponse<Document[]> = await res.json()
        if (isMounted) {
          if (res.ok && json.success) {
            setDocuments(json.data || [])
          } else {
            setError(json.error || "Erreur de chargement")
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erreur de chargement")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  const createDocument = useCallback(
    async (payload: { title: string; file_url: string; subject_id?: string | null }) => {
      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json: ApiResponse<Document> = await res.json()
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || "Échec de l'enregistrement du document")
        }
        setDocuments((prev) => [json.data!, ...prev])
        return json.data
      } catch (err) {
        throw err instanceof Error ? err : new Error("Erreur inattendue")
      }
    },
    []
  )

  const deleteDocument = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" })
      const json: ApiResponse<{ deleted: boolean }> = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Échec de la suppression")
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      throw err instanceof Error ? err : new Error("Erreur inattendue")
    }
  }, [])

  return {
    documents,
    isLoading,
    error,
    refresh: fetchDocuments,
    createDocument,
    deleteDocument,
  }
}

export function useSummarizeDocument() {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<DocumentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const summarize = useCallback(
    async (payload: { text: string; titleHint?: string }) => {
      setIsSummarizing(true)
      setError(null)
      try {
        const res = await fetch("/api/documents/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json: ApiResponse<SummarizeDocumentResponse> = await res.json()
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || "Échec de la génération du résumé")
        }
        setSummary(json.data.summary)
        return json.data.summary
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors du résumé"
        setError(message)
        throw err
      } finally {
        setIsSummarizing(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setSummary(null)
    setError(null)
  }, [])

  return {
    summarize,
    summary,
    isSummarizing,
    error,
    reset,
  }
}

export function useGenerateFlashcards() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(
    async (payload: { text: string; count?: number; subjectHint?: string }) => {
      setIsGenerating(true)
      setError(null)
      try {
        const res = await fetch("/api/documents/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json: ApiResponse<FlashcardsResponse> = await res.json()
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || "Échec de la génération des flashcards")
        }
        setFlashcards(json.data.flashcards)
        return json.data.flashcards
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la génération"
        setError(message)
        throw err
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setFlashcards([])
    setError(null)
  }, [])

  return {
    generate,
    flashcards,
    isGenerating,
    error,
    reset,
  }
}

export function useGenerateQuiz() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [quiz, setQuiz] = useState<QuizResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(
    async (payload: {
      text: string
      count?: number
      difficulty?: "facile" | "moyen" | "difficile"
      topicHint?: string
    }) => {
      setIsGenerating(true)
      setError(null)
      try {
        const res = await fetch("/api/documents/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json: ApiResponse<QuizResponse> = await res.json()
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error || "Échec de la génération du quiz")
        }
        setQuiz(json.data)
        return json.data
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la génération du quiz"
        setError(message)
        throw err
      } finally {
        setIsGenerating(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setQuiz(null)
    setError(null)
  }, [])

  return {
    generate,
    quiz,
    isGenerating,
    error,
    reset,
  }
}
