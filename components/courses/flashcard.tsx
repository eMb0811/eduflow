"use client";

import * as React from "react";
import { RotateCw, CheckCircle, HelpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { renderInlineFormatted } from "@/components/ui/formatted-text";

export interface FlashcardProps {
  id: string;
  question: string;
  answer: string;
  difficulty: "Facile" | "Moyen" | "Difficile";
  subject: string;
  onMastered?: (id: string) => void;
  onReviewLater?: (id: string) => void;
}

export function Flashcard({
  id,
  question,
  answer,
  difficulty,
  subject,
  onMastered,
  onReviewLater,
}: FlashcardProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  const getDifficultyBadge = () => {
    switch (difficulty) {
      case "Facile":
        return <Badge variant="success">Facile</Badge>;
      case "Moyen":
        return <Badge variant="warning">Moyen</Badge>;
      case "Difficile":
        return <Badge variant="destructive">Difficile</Badge>;
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Conteneur 3D Card Flip */}
      <div
        className="w-full h-72 sm:h-80 cursor-pointer [perspective:1000px] touch-manipulation select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-500 [transform-style:preserve-3d] transition-transform ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* Face avant : Question */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-2xl border-2 border-amber-500/30 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 p-4 sm:p-6 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                {subject}
              </span>
              {getDifficultyBadge()}
            </div>

            <div className="text-center my-auto px-2 sm:px-4">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5 sm:mb-2 block">
                Question
              </span>
              <p className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {renderInlineFormatted(question, "fc-q")}
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <RotateCw className="h-3.5 w-3.5" /> Appuyez pour révéler la réponse
            </div>
          </div>

          {/* Face arrière : Réponse */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl border-2 border-emerald-100 dark:border-emerald-950 bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/20 p-4 sm:p-6 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Explication clé
              </span>
              <span className="text-xs text-slate-400 font-mono">EduFlow IA</span>
            </div>

            <div className="text-center my-auto px-2 sm:px-4">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-1.5 sm:mb-2 block">
                Réponse
              </span>
              <p className="text-sm sm:text-base md:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                {renderInlineFormatted(answer, "fc-a")}
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-medium">
              <RotateCw className="h-3.5 w-3.5" /> Appuyez pour retourner la question
            </div>
          </div>
        </div>
      </div>

      {/* Boutons d'action sous la carte */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mt-4 sm:mt-6 w-full justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => onReviewLater?.(id)}
          className="w-full sm:w-auto h-10 sm:h-9 gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 touch-manipulation"
        >
          <HelpCircle className="h-4 w-4" /> À revoir plus tard
        </Button>
        <Button
          type="button"
          onClick={() => onMastered?.(id)}
          className="w-full sm:w-auto h-10 sm:h-9 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs touch-manipulation"
        >
          <CheckCircle className="h-4 w-4" /> Maîtrisé !
        </Button>
      </div>
    </div>
  );
}
