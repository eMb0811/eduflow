"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Award, Sparkles, MessageSquare, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { renderInlineFormatted } from "@/components/ui/formatted-text";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number; // 0, 1, 2, 3
  explanation: string;
}

interface QuizPlayerProps {
  title: string;
  subject: string;
  questions: QuizQuestion[];
  onRestart?: () => void;
  onComplete?: (percentage: number) => void;
  onUploadNextChapter?: () => void;
}

export function QuizPlayer({ title, subject, questions, onRestart, onComplete, onUploadNextChapter }: QuizPlayerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
  const [isAnswered, setIsAnswered] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [wrongAnswers, setWrongAnswers] = React.useState<
    Array<{ question: QuizQuestion; chosenIndex: number }>
  >([]);

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    if (index === currentQ.correctIndex) {
      setScore((prev) => prev + 1);
    } else {
      setWrongAnswers((prev) => [...prev, { question: currentQ, chosenIndex: index }]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
      const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
      onComplete?.(pct);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setWrongAnswers([]);
    setIsCompleted(false);
    onRestart?.();
  };

  const handleRemediateWithKocc = () => {
    const errorDetails = wrongAnswers
      .slice(0, 4)
      .map(
        (w, i) =>
          `Point ${i + 1} : "${w.question.question}" — Ma réponse était erronée. Correction attendue : "${w.question.explanation || w.question.options[w.question.correctIndex]}"`
      )
      .join("\n");

    const remediationPrompt = `Bonjour Kocc, je viens de terminer le quiz sur « ${title} » (${subject}) avec un score de ${score}/${questions.length}.\nJ'ai commis des erreurs sur ces questions :\n${errorDetails}\nPeux-tu m'expliquer de façon claire, synthétique et pédagogique pourquoi ces réponses sont correctes, avec un exemple simple pour que je comprenne mes erreurs ?`;

    router.push(
      `/chat?subject=${encodeURIComponent(subject)}&prompt=${encodeURIComponent(remediationPrompt)}`
    );
  };

  const optionLetters = ["A", "B", "C", "D"];

  if (isCompleted) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    return (
      <div className="max-w-xl mx-auto p-4 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center shadow-lg space-y-5">
        <div className="inline-flex p-3 sm:p-4 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Award className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Quiz Terminé !
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">{title} — {subject}</p>
        </div>

        <div className="p-4 sm:p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            {score} / {questions.length}
          </span>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
            Score global : {percentage}%
          </p>
          <div className="mt-3">
            <Progress value={percentage} />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {percentage >= 80
            ? "Excellent travail ! Vous maîtrisez les concepts fondamentaux de ce chapitre."
            : percentage >= 50
            ? "Bonne base, mais prévoyez une remédiation ciblée sur vos points de doute."
            : "Des révisions approfondies sont recommandées pour consolider ce chapitre."}
        </p>

        {/* Remédiation intelligente avec Kocc si erreurs */}
        {wrongAnswers.length > 0 ? (
          <div className="text-left rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Remédiation recommandée ({wrongAnswers.length} notion{wrongAnswers.length > 1 ? "s" : ""} à consolider)</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs text-slate-600 dark:text-slate-400">
              {wrongAnswers.map((w, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {renderInlineFormatted(w.question.question, `w-q-${idx}`)}
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Bonne réponse : {renderInlineFormatted(w.question.options[w.question.correctIndex], `w-opt-${idx}`)}
                  </p>
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleRemediateWithKocc}
              className="w-full gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm border border-slate-700/80 ring-1 ring-inset ring-amber-400/20 shadow-xs cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-amber-400" />
              Travailler mes erreurs avec Kocc
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full sm:w-auto gap-2 border-slate-200 dark:border-slate-700 font-semibold touch-manipulation cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Recommencer le Quiz
          </Button>

          {onUploadNextChapter && (
            <Button
              type="button"
              onClick={onUploadNextChapter}
              variant="outline"
              className="w-full sm:w-auto gap-2 border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-semibold touch-manipulation cursor-pointer"
            >
              <Upload className="h-4 w-4 text-amber-500" />
              Déposer le chapitre suivant
            </Button>
          )}

          {percentage >= 80 && (
            <Button
              type="button"
              onClick={() => router.push(`/chat?subject=${encodeURIComponent(subject)}&prompt=${encodeURIComponent(`J'ai obtenu ${score}/${questions.length} au quiz sur ${title} (${subject}). Peux-tu me poser 2 questions plus avancées pour tester mon approfondissement ?`)}`)}
              className="w-full sm:w-auto gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold touch-manipulation cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-400" /> Approfondir avec Kocc
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-8">
      {/* Barre de progression & Compteur */}
      <div className="mb-4 sm:mb-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Question {currentIndex + 1} sur {questions.length}</span>
          <span className="text-amber-600 dark:text-amber-400 font-mono">
            Score actuel : {score}
          </span>
        </div>
        <Progress value={progressPercent} />
      </div>

      {/* Intitulé de la question */}
      <div className="mb-4 sm:mb-6">
        <span className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold block mb-1">
          {subject}
        </span>
        <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
          {renderInlineFormatted(currentQ.question, "qz-q")}
        </h3>
      </div>

      {/* Options A, B, C, D */}
      <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
        {currentQ.options.map((option, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === currentQ.correctIndex;

          let btnStyle =
            "border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/40 bg-white dark:bg-slate-900";

          if (isAnswered) {
            if (isCorrect) {
              btnStyle =
                "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
            } else if (isSelected && !isCorrect) {
              btnStyle =
                "border-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200";
            } else {
              btnStyle = "border-slate-100 text-slate-400 dark:border-slate-800 opacity-60";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectOption(idx)}
              className={`w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.99] touch-manipulation min-h-[48px] ${btnStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold font-mono">
                  {optionLetters[idx]}
                </span>
                <span className="text-xs sm:text-sm font-medium">
                  {renderInlineFormatted(option, `qz-opt-${idx}`)}
                </span>
              </div>

              {isAnswered && (
                <div className="shrink-0 ml-2">
                  {isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explication & Bouton Suivant */}
      {isAnswered && (
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-in fade-in">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Explication :
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {renderInlineFormatted(currentQ.explanation, "qz-exp")}
            </p>
          </div>
          <Button
            onClick={handleNext}
            className="w-full sm:w-auto gap-2 shrink-0 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 font-semibold touch-manipulation active:scale-[0.98]"
          >
            {currentIndex < questions.length - 1 ? (
              <>
                Question suivante <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Résultat final"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
