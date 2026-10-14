"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Send,
  Trash2,
  Bot,
  User,
  GraduationCap,
  Calculator,
  Binary,
  BookOpen,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { MarkdownRenderer } from "@/components/chat/markdown-renderer"
import { useAiChat } from "@/hooks/use-ai-chat"
import { useProfile } from "@/hooks/use-profile"

const SUGGESTIONS = [
  {
    icon: Binary,
    label: "Algorithmes & Complexité",
    prompt: "Explique-moi le fonctionnement du tri fusion (Merge Sort) et démontre pourquoi sa complexité est en $O(n \\log n)$.",
  },
  {
    icon: Calculator,
    label: "Mathématiques & Formules",
    prompt: "Énonce et explique le théorème des valeurs intermédiaires avec un exemple concret et sa formule mathématique.",
  },
  {
    icon: BookOpen,
    label: "Systèmes d'Exploitation",
    prompt: "Quelle est la différence fondamentale entre un thread et un processus ? Comment le système gère-t-il la mémoire partagée ?",
  },
  {
    icon: GraduationCap,
    label: "Méthodologie d'examen",
    prompt: "Donne-moi 5 techniques validées par les sciences cognitives pour retenir mes définitions d'examen sans bachoter.",
  },
]

export default function AssistantPage() {
  const [inputText, setInputText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: profile } = useProfile()
  const { messages, isLoadingHistory, isStreaming, sendMessage, clearHistory } = useAiChat()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming])

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return
    const text = inputText
    setInputText("")
    void sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between rounded-lg border border-border bg-card px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-bold tracking-tight text-foreground">
                Assistant d&apos;études
              </h1>
              <Badge variant="outline" className="gap-1.5 text-[11px] font-normal text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Tuteur interactif
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {profile?.full_name ? `Espace de travail de ${profile.full_name}` : "Aide aux devoirs et explications de cours"}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            disabled={isStreaming}
            className="text-xs text-muted-foreground hover:text-destructive rounded-xl gap-1.5"
            title="Effacer la conversation"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Effacer</span>
          </Button>
        )}
      </div>

      {/* Main Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden rounded-2xl border-border/80 bg-card/60 backdrop-blur-xl">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
          {isLoadingHistory ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
              <Skeleton className="h-24 w-5/6 ml-auto rounded-2xl" />
              <Skeleton className="h-20 w-2/3 rounded-2xl" />
            </div>
          ) : messages.length === 0 ? (
            /* Welcome Empty State */
            <div className="flex h-full flex-col items-center justify-center text-center max-w-2xl mx-auto py-8">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-inner">
                <Bot className="size-7" />
              </span>
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
                Comment puis-je t&apos;aider aujourd&apos;hui ?
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
                Pose-moi des questions sur tes cours, demande des explications de formules LaTeX, ou du code informatique documenté.
              </p>

              {/* Suggestions grid */}
              <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {SUGGESTIONS.map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(item.prompt)
                        textareaRef.current?.focus()
                      }}
                      className="group rounded-xl border border-border/70 bg-background/50 p-3.5 text-left transition-all hover:border-primary/50 hover:bg-background/90 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span>{item.label}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {item.prompt}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Message Feed */
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((message) => {
                  const isUser = message.role === "user"
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-sm shadow-primary/20 mt-1">
                          <Sparkles className="size-4" />
                        </span>
                      )}

                      <div
                        className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-background/80 border border-border/70 rounded-bl-sm"
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        ) : message.content === "" ? (
                          <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
                            <span className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                            <span className="size-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                            <span className="size-2 rounded-full bg-primary/60 animate-bounce" />
                          </div>
                        ) : (
                          <MarkdownRenderer content={message.content} />
                        )}
                      </div>

                      {isUser && (
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground mt-1 shadow-sm">
                          <User className="size-4" />
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-border/70 bg-background/50 p-3 sm:p-4 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-end gap-2.5"
          >
            <textarea
              id="chat-input"
              name="message"
              aria-label="Votre question pour l'assistant d'études"
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pose ta question (cours, formules, code, révisions)..."
              rows={1}
              className="flex-1 max-h-36 min-h-[44px] resize-none rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={!inputText.trim() || isStreaming}
              className="size-11 shrink-0 rounded-xl"
              title="Envoyer le message"
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Appuie sur <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Entrée</kbd> pour envoyer, <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Maj + Entrée</kbd> pour une nouvelle ligne.
          </p>
        </div>
      </Card>
    </div>
  )
}
