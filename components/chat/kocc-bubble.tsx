"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Send,
  Sparkles,
  Maximize2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { KoccIcon } from "@/components/icons/kocc-icon";
import { FormattedText } from "@/components/ui/formatted-text";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_SUGGESTIONS = [
  "Explique-moi un concept avec méthode",
  "Conseille-moi une stratégie de révision",
  "Comment structurer mon travail ?",
];

export function KoccBubble() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "kocc-welcome",
      role: "assistant",
      content: "Quelle notion ou quel cours travaillons-nous ?",
      timestamp: "En ligne",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [isInputFocused, setIsInputFocused] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;
    // Garder ouvert si l'étudiant est en train d'écrire ou si une réponse est en cours
    if (isInputFocused || input.trim().length > 0 || isTyping) {
      return;
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll au bas des messages
  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Si on est déjà sur la page /chat, la bulle flottante reste discrète
  const isChatPage = pathname === "/chat";

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isTyping) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Erreur de réponse du serveur");
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");

        const assistantMsgId = `kocc-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);

        let accumulatedContent = "";

        if (reader) {
          let doneReading = false;
          while (!doneReading) {
            const { value, done } = await reader.read();
            doneReading = done;
            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const dataStr = line.replace("data: ", "").trim();
                  if (dataStr === "[DONE]") break;

                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.content) {
                      accumulatedContent += parsed.content;
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMsgId
                            ? { ...msg, content: accumulatedContent }
                            : msg
                        )
                      );
                    }
                  } catch {
                    // Ignore parse error
                  }
                }
              }
            }
          }
        }
      } else {
        const json = await res.json();
        if (json.success && json.data) {
          setMessages((prev) => [
            ...prev,
            {
              id: json.data.assistant_message.id,
              role: "assistant",
              content: json.data.assistant_message.content,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Désolé, je rencontre une difficulté de connexion. Veuillez réessayer dans un instant.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Masquer la bulle sur la page /chat car l'espace studio dispose déjà de sa zone de saisie dédiée intégrée
  if (isChatPage) {
    return null;
  }

  return (
    <div
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Fenêtre de chat flottante Kocc */}
      {isOpen && (
        <div className="mb-2 sm:mb-3 w-[calc(100vw-1.5rem)] sm:w-[400px] max-w-[400px] h-[480px] max-h-[72vh] sm:max-h-[80vh] rounded-xl border border-slate-300/90 dark:border-slate-700/90 ring-1 ring-inset ring-slate-900/[0.05] dark:ring-white/[0.06] bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header de la bulle : uniquement Kocc */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 ring-1 ring-inset ring-amber-400/25 text-amber-400">
                <KoccIcon className="h-4.5 w-4.5" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-slate-900" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-white">
                Kocc
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Ouvrir Kocc en plein écran"
              >
                <Maximize2 className="h-4 w-4" />
              </Link>
              <button
                onClick={() => {
                  setIsInputFocused(false);
                  setIsOpen(false);
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Fermer Kocc"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Suggestions rapides */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            {QUICK_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(suggestion)}
                className="whitespace-nowrap px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500/50 transition-colors shrink-0 text-[11px]"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Corps de discussion */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20 text-sm">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs sm:text-sm leading-relaxed",
                      isUser
                        ? "bg-slate-900 text-white border border-slate-800 ring-1 ring-inset ring-amber-400/20 rounded-tr-xs"
                        : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-tl-xs"
                    )}
                  >
                    {isUser ? m.content : <FormattedText text={m.content} compact />}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {isUser ? "Vous" : "Kocc"} • {m.timestamp}
                  </span>
                </div>
              );
            })}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Barre de saisie */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                id="kocc-bubble-input"
                name="kocc-bubble-input"
                type="text"
                placeholder="Posez votre question à Kocc..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                disabled={isTyping}
                className="h-9 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isTyping}
                className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white shrink-0 font-medium rounded-lg ring-1 ring-inset ring-amber-400/25"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-amber-400" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Bulle flottante Kocc (Bouton d'interaction persistant) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={handleMouseEnter}
        className={cn(
          "relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-amber-400 shadow-xl border border-slate-700/90 ring-1 ring-inset ring-amber-400/20 hover:border-amber-400/60 hover:ring-amber-400/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer group",
          isOpen && "bg-slate-800 text-white border-amber-400/50"
        )}
        aria-label="Kocc"
        title="Poser une question à Kocc"
      >
        {isOpen ? (
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <>
            <KoccIcon className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400 group-hover:text-amber-300 transition-colors" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
          </>
        )}
      </button>
    </div>
  );
}
