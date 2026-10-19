"use client";

import * as React from "react";
import { User, Copy, Check, Sparkles, Lightbulb, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { KoccIcon } from "@/components/icons/kocc-icon";
import { FormattedText, stripRawMarkdown } from "@/components/ui/formatted-text";

export interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  onQuickAction?: (actionPrompt: string) => void;
  isLatestAssistant?: boolean;
}

export function ChatBubble({
  role,
  content,
  timestamp,
  onQuickAction,
  isLatestAssistant,
}: ChatBubbleProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(stripRawMarkdown(content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = role === "user";
  const showActions = !isUser && Boolean(onQuickAction) && content.trim().length > 20;

  return (
    <div
      className={cn(
        "flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs",
          isUser
            ? "bg-slate-900 text-white dark:bg-slate-800"
            : "bg-slate-900 text-amber-400 border border-slate-700/80 ring-1 ring-inset ring-amber-400/20"
        )}
      >
        {isUser ? <User className="h-4 w-4 sm:h-5 sm:w-5" /> : <KoccIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
      </div>

      {/* Bulle de message */}
      <div
        className={cn(
          "relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4.5 shadow-2xs space-y-2",
          isUser
            ? "rounded-tr-xs bg-slate-900 text-white border border-slate-800 ring-1 ring-inset ring-amber-400/20"
            : "rounded-tl-xs bg-white text-slate-900 border border-slate-200/90 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
        )}
      >
        <div className="text-xs sm:text-sm leading-relaxed">
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : (
            <FormattedText text={content} />
          )}
        </div>

        {/* Actions rapides pédagogiques sous la réponse de Kocc */}
        {showActions && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onQuickAction?.(
                  "Peux-tu m'expliquer cette notion de manière encore plus simple et intuitive, avec une analogie concrète de la vie courante ?"
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Lightbulb className="h-3 w-3 text-amber-500" />
              <span>Simplifier</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onQuickAction?.(
                  "Donne-moi un exemple concret d'application ou d'exercice résolu pas à pas sur ce point précis."
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Exemple concret</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onQuickAction?.(
                  "Résume ce que tu viens d'expliquer en 3 points essentiels maximum à retenir pour un examen."
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <ListChecks className="h-3 w-3 text-amber-500" />
              <span>Résumer (3 points)</span>
            </button>
          </div>
        )}

        {/* Pied de message : Nom, horodatage et bouton Copier */}
        <div
          className={cn(
            "pt-1 flex items-center justify-between gap-3 text-[10px]",
            isUser ? "text-slate-300" : "text-slate-400"
          )}
        >
          <span className="font-medium">
            {isUser ? "Vous" : "Kocc"} • {timestamp}
          </span>
          {!isUser && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Copier la réponse"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copié</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copier</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
