"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import type { ChatMessage } from "@/types/database"

export interface MessageItem {
  id: string
  role: "user" | "assistant"
  content: string
  created_at?: string
}

export function useAiChat() {
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Chargement de l'historique au montage
  useEffect(() => {
    let isCancelled = false

    async function loadHistory() {
      try {
        const res = await fetch("/api/ai/chat")
        if (!res.ok) throw new Error("Erreur de récupération de l'historique")
        const json = await res.json()
        if (json.success && Array.isArray(json.data) && !isCancelled) {
          const items: MessageItem[] = json.data
            .filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
            .map((m: ChatMessage) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              created_at: m.created_at,
            }))
          setMessages(items)
        }
      } catch {
        // En cas d'erreur réseau, historique vide
      } finally {
        if (!isCancelled) setIsLoadingHistory(false)
      }
    }

    void loadHistory()

    return () => {
      isCancelled = true
    }
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      const userMsgId = crypto.randomUUID()
      const assistantMsgId = crypto.randomUUID()

      const userMessage: MessageItem = {
        id: userMsgId,
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      }

      const assistantMessage: MessageItem = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      }

      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsStreaming(true)

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: historyPayload,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorJson = await response.json().catch(() => null)
          throw new Error(
            errorJson?.error || `Erreur lors de la réponse du serveur (${response.status})`
          )
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("Le flux de réponse n'est pas lisible")

        const decoder = new TextDecoder()
        let accumulatedText = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          accumulatedText += chunk

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
            )
          )
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return
        }
        const errorMsg =
          err instanceof Error ? err.message : "Échec de génération de la réponse IA"
        toast.error("Erreur de conversation", { description: errorMsg })

        // Supprime le message assistant vide en cas d'erreur immédiate
        setMessages((prev) =>
          prev.filter((msg) => !(msg.id === assistantMsgId && msg.content === ""))
        )
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [messages, isStreaming]
  )

  const clearHistory = useCallback(async () => {
    try {
      await fetch("/api/ai/chat", { method: "DELETE" })
      setMessages([])
      toast.success("Historique effacé", {
        description: "La conversation a été réinitialisée.",
      })
    } catch {
      toast.error("Impossible d'effacer l'historique")
    }
  }, [])

  return {
    messages,
    isLoadingHistory,
    isStreaming,
    sendMessage,
    clearHistory,
  }
}
