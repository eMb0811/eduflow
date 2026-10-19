"use client";

import * as React from "react";
import {
  Send,
  Plus,
  Trash2,
  AlertCircle,
  History,
  X,
  BookOpen,
  HelpCircle,
  Lightbulb,
  CheckCircle,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  Sparkles,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { KoccIcon } from "@/components/icons/kocc-icon";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  date: string;
}

const QUICK_SUGGESTIONS = [
  {
    icon: Lightbulb,
    title: "Méthode Feynman",
    desc: "Explique-moi ce concept avec des mots simples et une analogie",
    prompt:
      "Peux-tu m'expliquer le concept clé de cette matière en utilisant la méthode Feynman (termes simples, analogie concrète, sans jargon inutile) ?",
  },
  {
    icon: HelpCircle,
    title: "Test diagnostique",
    desc: "3 questions pour évaluer ma maîtrise",
    prompt:
      "Pose-moi 3 questions progressives et ciblées pour évaluer ma compréhension, une par une.",
  },
  {
    icon: BookOpen,
    title: "Synthèse allégée",
    desc: "Les 3 points capitaux à retenir",
    prompt:
      "Fais-moi une synthèse claire, allégée et structurée en 3 points essentiels maximum sans détails superflus.",
  },
  {
    icon: CheckCircle,
    title: "Pièges fréquents",
    desc: "Les erreurs classiques aux examens",
    prompt:
      "Quels sont les pièges et erreurs les plus fréquents commis par les étudiants sur ce sujet aux examens ?",
  },
];

export default function ChatPage() {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [activeSubject, setActiveSubject] = React.useState<string | null>(null);
  const [availableSubjects, setAvailableSubjects] = React.useState<string[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = React.useState(false);

  // Modales de suppression
  const [sessionToDelete, setSessionToDelete] = React.useState<Conversation | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const hasAutoSentPromptRef = React.useRef(false);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Envoi d'un message (soit via formulaire, suggestion chip, ou auto-remédiation de quiz)
  const sendMessage = React.useCallback(
    async (promptText: string, explicitSubject?: string) => {
      const text = promptText.trim();
      if (!text || isTyping) return;

      const currentSubject = explicitSubject || activeSubject || undefined;

      setErrorMessage(null);
      const userMsg: Message = {
        id: `usr-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setIsTyping(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json",
          },
          body: JSON.stringify({
            message: text,
            session_id: activeSessionId || undefined,
            subject_name: currentSubject,
          }),
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          throw new Error(errorJson.message || "Erreur de réponse du tuteur IA");
        }

        const contentType = res.headers.get("content-type") || "";

        // Si streaming SSE
        if (contentType.includes("text/event-stream") && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let assistantContent = "";
          const assistantId = `ai-${Date.now()}`;

          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content: "",
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);

          let done = false;
          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              const chunk = decoder.decode(value);
              const lines = chunk.split("\n\n");
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const event = JSON.parse(line.substring(6));
                    if (event.type === "content") {
                      assistantContent += event.content;
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId ? { ...m, content: assistantContent } : m
                        )
                      );
                    } else if (event.type === "done") {
                      if (event.session_id) {
                        setActiveSessionId(event.session_id);
                        // Rafraîchir la liste des sessions si nouvelle session créée
                        setConversations((prev) => {
                          if (prev.some((c) => c.id === event.session_id)) return prev;
                          return [
                            {
                              id: event.session_id,
                              title: text.substring(0, 32) + (text.length > 32 ? "..." : ""),
                              date: "Aujourd'hui",
                            },
                            ...prev,
                          ];
                        });
                      }
                    }
                  } catch {
                    // Ignore JSON chunk parse error
                  }
                }
              }
            }
          }
        } else {
          // Fallback JSON standard
          const json = await res.json();
          if (json.success && json.data) {
            setActiveSessionId(json.data.session_id);
            setConversations((prev) => {
              if (prev.some((c) => c.id === json.data.session_id)) return prev;
              return [
                {
                  id: json.data.session_id,
                  title: text.substring(0, 32) + (text.length > 32 ? "..." : ""),
                  date: "Aujourd'hui",
                },
                ...prev,
              ];
            });
            const assistantMsg: Message = {
              id: json.data.assistant_message.id,
              role: "assistant",
              content: json.data.assistant_message.content,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            setMessages((prev) => [...prev, assistantMsg]);
          }
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Erreur de connexion avec le serveur IA"
        );
      } finally {
        setIsTyping(false);
      }
    },
    [activeSessionId, activeSubject, isTyping]
  );

  // Charger la discussion initiale depuis l'API MySQL
  const loadChat = React.useCallback(async (sessionId?: string) => {
    try {
      const url = sessionId
        ? `/api/ai/chat?session_id=${encodeURIComponent(sessionId)}`
        : "/api/ai/chat";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.session_id) {
            setActiveSessionId(json.data.session_id);
          }
          if (Array.isArray(json.data.subjects)) {
            setAvailableSubjects(json.data.subjects);
          }
          if (Array.isArray(json.data.sessions)) {
            setConversations(
              json.data.sessions.map((s: { id: string; title: string; created_at: string }) => ({
                id: s.id,
                title: s.title || "Discussion",
                date: new Date(s.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                }),
              }))
            );
          }
          if (Array.isArray(json.data.messages) && json.data.messages.length > 0) {
            setMessages(
              json.data.messages.map((m: { id: string; role: "user" | "assistant"; content: string; created_at: string }) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }))
            );
          } else {
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content:
                  "Bonjour ! Je suis Kocc, votre tuteur académique. Quelle notion ou quel cours travaillons-nous aujourd'hui ?",
                timestamp: "En ligne",
              },
            ]);
          }
        }
      }
    } catch (err) {
      console.error("Erreur chargement messages :", err);
    }
  }, []);

  React.useEffect(() => {
    loadChat();

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const promptParam = searchParams.get("prompt");
      const contextParam = searchParams.get("context");
      const subjectParam = searchParams.get("subject");

      if (subjectParam) {
        setActiveSubject(subjectParam);
      }

      // Si un prompt explicite est passé (ex: remédiation de quiz), l'exécuter directement
      if (promptParam && !hasAutoSentPromptRef.current) {
        hasAutoSentPromptRef.current = true;
        setTimeout(() => {
          sendMessage(promptParam, subjectParam || undefined);
        }, 200);
      } else if (contextParam) {
        setInputValue(contextParam);
      } else if (subjectParam && !promptParam) {
        setInputValue(`J'aimerais faire le point et approfondir mon cours de ${subjectParam}.`);
      }
    }
  }, [loadChat, sendMessage]);

  const handleNewConversation = () => {
    setActiveSessionId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: "Nouvelle discussion initialisée. Quelle notion abordons-nous ?",
        timestamp: "En ligne",
      },
    ]);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Suppression d'une session individuelle
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/ai/chat?session_id=${encodeURIComponent(sessionToDelete.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const remaining = conversations.filter((c) => c.id !== sessionToDelete.id);
        setConversations(remaining);

        // Si la session supprimée était celle active, basculer vers une nouvelle discussion
        if (activeSessionId === sessionToDelete.id) {
          if (remaining.length > 0) {
            await loadChat(remaining[0].id);
          } else {
            handleNewConversation();
          }
        }
        setSessionToDelete(null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(errJson.message || "Impossible de supprimer la discussion");
      }
    } catch {
      setErrorMessage("Erreur réseau lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  // Suppression de tout l'historique
  const handleDeleteAllSessions = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/ai/chat?all=true", {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations([]);
        handleNewConversation();
        setIsDeleteAllModalOpen(false);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(errJson.message || "Impossible de supprimer l'historique");
      }
    } catch {
      setErrorMessage("Erreur réseau lors de la suppression totale");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isTyping) {
        sendMessage(inputValue);
      }
    }
  };

  return (
    <>
      <div className="flex flex-1 h-full min-h-0 rounded-2xl border border-[#E8E4DC] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden font-sans">
        {/* ======================================================== */}
        {/* 1. BARRE LATÉRALE GAUCHE : HISTORIQUE RÉTRACTABLE (DESKTOP) */}
        {/* ======================================================== */}
        {isSidebarOpen && (
          <aside className="w-72 lg:w-80 border-r border-[#E8E4DC] dark:border-slate-800 flex flex-col bg-[#FAF8F5]/80 dark:bg-slate-950/50 hidden md:flex shrink-0 transition-all duration-200">
            {/* Haut de sidebar : Nouvelle discussion + Effacer tout */}
            <div className="p-3 border-b border-[#E8E4DC] dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-amber-500" />
                  Discussions
                </span>
                {conversations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteAllModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                    title="Effacer tout l'historique"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Tout effacer</span>
                  </button>
                )}
              </div>

              <Button
                onClick={handleNewConversation}
                className="w-full gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs h-9.5 rounded-lg shadow-2xs cursor-pointer border border-slate-700/80"
              >
                <Plus className="h-4 w-4 text-amber-400" />
                <span>Nouvelle discussion</span>
              </Button>
            </div>

            {/* Liste des discussions avec bouton corbeille au survol */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
              {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <FolderOpen className="h-8 w-8 mb-2 stroke-[1.5] text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Aucune discussion archivée
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Vos échanges avec Kocc apparaîtront ici automatiquement.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isCurrent = conv.id === activeSessionId;
                  return (
                    <div
                      key={conv.id}
                      className={cn(
                        "group relative w-full rounded-lg border transition-all duration-150 flex items-center justify-between gap-2 px-3 py-2 cursor-pointer",
                        isCurrent
                          ? "bg-white dark:bg-slate-900 border-amber-500/40 text-slate-900 dark:text-white shadow-2xs font-semibold ring-1 ring-amber-500/20"
                          : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-900/60 hover:border-[#E8E4DC] dark:hover:border-slate-800"
                      )}
                      onClick={() => loadChat(conv.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate leading-snug">{conv.title}</p>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          {conv.date}
                        </span>
                      </div>

                      {/* Bouton de suppression de session (corbeille au survol) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSessionToDelete(conv);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                        title="Supprimer cette discussion"
                        aria-label="Supprimer cette discussion"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* ======================================================== */}
        {/* 2. ZONE CENTRALE DE DISCUSSION                           */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 min-w-0">
          {/* Header moderne de Kocc avec sélecteur de matière & toggle sidebar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[#E8E4DC] dark:border-slate-800 bg-[#FAF8F5]/90 dark:bg-slate-900/90 backdrop-blur-xs shrink-0 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Toggle Sidebar Desktop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className="hidden md:inline-flex h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                title={isSidebarOpen ? "Masquer l'historique" : "Afficher l'historique"}
                aria-label="Basculer l'historique"
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>

              {/* Bouton tiroir mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileHistoryOpen(true)}
                className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white md:hidden shrink-0 cursor-pointer"
                title="Historique des discussions"
                aria-label="Historique des discussions"
              >
                <History className="h-4 w-4" />
              </Button>

              <div className="flex h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-700/80 ring-1 ring-inset ring-amber-400/20 text-amber-400 shadow-2xs">
                <KoccIcon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    Kocc Barma IA
                  </h2>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="En ligne" />
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-500/30 px-1.5 py-0 hidden sm:inline-flex"
                  >
                    Gemini 3.8 Flash
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Tuteur académique • Méthode maïeutique et remédiation
                </p>
              </div>
            </div>

            {/* Sélecteur de matière & Actions d'en-tête */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sélecteur contextuel de matière */}
              {availableSubjects.length > 0 && (
                <div className="hidden sm:block">
                  <Select
                    value={activeSubject || "all"}
                    onValueChange={(val) => setActiveSubject(val === "all" ? null : val)}
                  >
                    <SelectTrigger className="h-8.5 text-xs w-[180px] bg-white dark:bg-slate-800 border-[#E8E4DC] dark:border-slate-700 font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <GraduationCap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">
                          {activeSubject || "Toutes les matières"}
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent align="end" className="text-xs">
                      <SelectItem value="all">Toutes les matières</SelectItem>
                      {availableSubjects.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tag mobile de matière sélectionnée */}
              {activeSubject && (
                <div className="sm:hidden flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/30 max-w-[120px] truncate">
                  <span className="truncate">{activeSubject}</span>
                  <button
                    type="button"
                    onClick={() => setActiveSubject(null)}
                    className="text-amber-700 hover:text-red-600 dark:text-amber-300 ml-0.5 cursor-pointer"
                    title="Désélectionner"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleNewConversation}
                className="h-8.5 px-2.5 text-xs gap-1 border-[#E8E4DC] dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                title="Nouvelle discussion"
              >
                <Plus className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline font-medium">Nouveau</span>
              </Button>
            </div>
          </div>

          {/* Message d'erreur éventuel */}
          {errorMessage && (
            <div className="m-3 p-3 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-900/40 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 text-red-600 hover:text-red-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Liste des messages & État d'accueil */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                onQuickAction={(prompt) => sendMessage(prompt)}
              />
            ))}

            {/* Suggestions interactives dès l'ouverture d'une nouvelle discussion */}
            {messages.length <= 1 && !isTyping && (
              <div className="pt-3 pb-4 space-y-3 max-w-3xl mx-auto animate-in fade-in duration-300">
                <div className="text-center space-y-1 py-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-2xs">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white pt-2">
                    Comment Kocc peut-il vous éclairer aujourd&apos;hui ?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Choisissez une méthode pédagogique ci-dessous ou posez directement votre question sur un cours.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QUICK_SUGGESTIONS.map((sug, idx) => {
                    const Icon = sug.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendMessage(sug.prompt)}
                        className="text-left p-3.5 rounded-xl border border-[#E8E4DC] dark:border-slate-800 bg-[#FAF8F5]/60 dark:bg-slate-800/40 hover:bg-amber-500/[0.04] hover:border-amber-500/40 transition-all duration-150 group cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {sug.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {sug.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* ======================================================== */}
          {/* 3. COMPOSER / ZONE DE SAISIE MULTI-LIGNES MODERNE        */}
          {/* ======================================================== */}
          <div className="shrink-0 p-2.5 sm:p-4 border-t border-[#E8E4DC] dark:border-slate-800 bg-[#FAF8F5]/90 dark:bg-slate-900/90 backdrop-blur-xs">
            {/* Puces de relance rapide au-dessus de la saisie */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() =>
                  sendMessage(
                    "Fais-moi un test rapide de 3 questions sur les notions fondamentales de cette matière."
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-[#E8E4DC] dark:border-slate-700 text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
              >
                <HelpCircle className="h-3 w-3 text-amber-500" />
                <span>Quiz express (3 questions)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  sendMessage(
                    "Explique-moi les formules et théorèmes clés indispensables pour réussir mon prochain devoir."
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-[#E8E4DC] dark:border-slate-700 text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
              >
                <Lightbulb className="h-3 w-3 text-amber-500" />
                <span>Formules &amp; Théorèmes clés</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  sendMessage(
                    "Quelles sont les erreurs types et pièges à éviter absolument sur cette matière ?"
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-[#E8E4DC] dark:border-slate-700 text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle className="h-3 w-3 text-amber-500" />
                <span>Pièges d&apos;examen</span>
              </button>
            </div>

            {/* Formulaire de saisie extensible */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputValue.trim() && !isTyping) {
                  sendMessage(inputValue);
                }
              }}
              className="relative flex items-center sm:items-end gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 p-2 shadow-2xs focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all"
            >
              <textarea
                ref={textareaRef}
                id="kocc-prompt-input"
                name="kocc-prompt-input"
                rows={1}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeSubject
                    ? `Posez votre question sur « ${activeSubject} »...`
                    : "Écrivez votre message à Kocc..."
                }
                disabled={isTyping}
                className="flex-1 max-h-36 min-h-[42px] resize-none border-0 bg-transparent px-2.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />

              <Button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold shadow-xs shrink-0 cursor-pointer disabled:opacity-40 transition-all flex items-center justify-center"
                title="Envoyer le message (Entrée)"
                aria-label="Envoyer le message"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <div className="flex items-center justify-between pt-1 px-1 text-[10px] text-slate-400">
              <span className="hidden sm:inline">Maj + Entrée pour un saut de ligne</span>
              <span className="ml-auto">Propulsé par Google Gemini 3.8 Flash</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODALE DE SUPPRESSION D'UNE SESSION INDIVIDUELLE      */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(sessionToDelete)}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Trash2 className="h-4.5 w-4.5 text-red-600" />
              Supprimer cette discussion ?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              Êtes-vous sûr de vouloir supprimer la discussion{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                « {sessionToDelete?.title} »
              </strong>{" "}
              ? Cette action est irréversible et effacera l&apos;intégralité des messages de cette session.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionToDelete(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSession}
              disabled={isDeleting}
              className="text-xs font-semibold gap-1.5 bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 5. MODALE DE SUPPRESSION DE TOUT L'HISTORIQUE            */}
      {/* ======================================================== */}
      <Dialog open={isDeleteAllModalOpen} onOpenChange={setIsDeleteAllModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Effacer tout l&apos;historique ?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 pt-1 leading-relaxed">
              Vous êtes sur le point de supprimer l&apos;ensemble de vos{" "}
              <strong className="text-slate-900 dark:text-white">
                {conversations.length} discussion{conversations.length > 1 ? "s" : ""}
              </strong>{" "}
              avec Kocc Barma. Tous vos historiques de messages et d&apos;échanges académiques seront définitivement effacés.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteAllModalOpen(false)}
              disabled={isDeleting}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllSessions}
              disabled={isDeleting}
              className="text-xs font-semibold gap-1.5 bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Effacement...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Tout effacer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 6. TIROIR MOBILE POUR L'HISTORIQUE (SMARTPHONE)          */}
      {/* ======================================================== */}
      <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
        <SheetContent side="left" className="w-[300px] p-0 flex flex-col border-r border-[#E8E4DC] dark:border-slate-800">
          <SheetHeader className="p-3.5 border-b border-[#E8E4DC] dark:border-slate-800 flex flex-row items-center justify-between">
            <SheetTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-amber-500" />
              Discussions ({conversations.length})
            </SheetTitle>
            {conversations.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMobileHistoryOpen(false);
                  setIsDeleteAllModalOpen(true);
                }}
                className="text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Effacer tout</span>
              </button>
            )}
          </SheetHeader>

          <div className="p-3 border-b border-[#E8E4DC] dark:border-slate-800">
            <Button
              onClick={() => {
                handleNewConversation();
                setMobileHistoryOpen(false);
              }}
              className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9 rounded-lg cursor-pointer"
            >
              <Plus className="h-4 w-4 text-amber-400" />
              <span>Nouvelle discussion</span>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Aucune discussion archivée
              </p>
            ) : (
              conversations.map((conv) => {
                const isCurrent = conv.id === activeSessionId;
                return (
                  <div
                    key={conv.id}
                    className={cn(
                      "w-full rounded-lg border transition-all flex items-center justify-between gap-2 px-3 py-2 cursor-pointer touch-manipulation",
                      isCurrent
                        ? "bg-amber-500/10 border-amber-500/40 text-slate-900 dark:text-white font-semibold"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    onClick={() => {
                      loadChat(conv.id);
                      setMobileHistoryOpen(false);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate">{conv.title}</p>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        {conv.date}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobileHistoryOpen(false);
                        setSessionToDelete(conv);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Supprimer cette discussion"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
