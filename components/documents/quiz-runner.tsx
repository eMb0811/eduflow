"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  RotateCcw,
  Trophy,
  Sparkles,
  Award,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { QuizResponse } from "@/types/api"

interface QuizRunnerProps {
  quiz: QuizResponse
  onReset?: () => void
}

const OPTION_LETTERS = ["A", "B", "C", "D"]

export function QuizRunner({ quiz, onReset }: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
  const [userAnswers, setUserAnswers] = useState<
    Array<{
      questionIndex: number
      selectedOption: number
      isCorrect: boolean
    }>
  >([])
  const [isFinished, setIsFinished] = useState(false)

  const questions = quiz.questions
  const currentQuestion = questions[currentIndex]

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return
    setSelectedOption(index)
  }

  const handleValidateAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return
    const isCorrect = selectedOption === currentQuestion.correct_option_index
    setIsAnswerSubmitted(true)
    setUserAnswers((prev) => [
      ...prev,
      {
        questionIndex: currentIndex,
        selectedOption,
        isCorrect,
      },
    ])
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setSelectedOption(null)
      setIsAnswerSubmitted(false)
    } else {
      setIsFinished(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setIsAnswerSubmitted(false)
    setUserAnswers([])
    setIsFinished(false)
    if (onReset) onReset()
  }

  const score = userAnswers.filter((a) => a.isCorrect).length
  const total = questions.length
  const percentage = Math.round((score / total) * 100)

  // End screen
  if (isFinished) {
    return (
      <Card className="max-w-2xl mx-auto p-6 sm:p-8 space-y-6 text-center border shadow-xl bg-card">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="inline-flex p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            {percentage >= 80 ? (
              <Trophy className="h-10 w-10 text-amber-500" />
            ) : percentage >= 50 ? (
              <Award className="h-10 w-10 text-primary" />
            ) : (
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{quiz.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">Évaluation complétée</p>
          </div>

          <div className="py-4">
            <div className="text-5xl font-extrabold text-foreground tracking-tight">
              {score} <span className="text-2xl font-medium text-muted-foreground">/ {total}</span>
            </div>
            <p className="text-sm font-medium mt-2">
              {percentage >= 80 ? (
                <span className="text-emerald-600 dark:text-emerald-400">Excellent résultat : notions fondamentales acquises avec succès.</span>
              ) : percentage >= 50 ? (
                <span className="text-primary">Bonne compréhension : quelques notions méritent d&apos;être approfondies.</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">Révision recommandée : relisez la synthèse avant de retenter le quiz.</span>
              )}
            </p>
          </div>

          {/* Breakdown summary */}
          <div className="space-y-3 text-left pt-2 border-t border-border">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Récapitulatif des questions
            </h4>
            <div className="space-y-2">
              {questions.map((q, idx) => {
                const answer = userAnswers.find((a) => a.questionIndex === idx)
                const isCorrect = answer?.isCorrect
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-secondary/20 text-xs"
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{q.question}</p>
                      <p className="text-muted-foreground">
                        Bonne réponse :{" "}
                        <span className="text-emerald-400 font-medium">
                          {q.options[q.correct_option_index]}
                        </span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <Button onClick={handleRestart} className="gap-2 font-medium">
              <RotateCcw className="h-4 w-4" />
              Recommencer le quiz
            </Button>
          </div>
        </motion.div>
      </Card>
    )
  }

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100)

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Quiz Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs mb-1">
              Auto-évaluation formative
            </Badge>
            <h3 className="text-base font-semibold text-foreground tracking-tight">{quiz.title}</h3>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              Question {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="p-6 sm:p-7 space-y-6 border shadow-lg bg-card">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <HelpCircle className="h-3.5 w-3.5" />
            Question {currentIndex + 1}
          </div>
          <h4 className="text-lg sm:text-xl font-medium text-foreground leading-relaxed">
            {currentQuestion.question}
          </h4>
        </div>

        {/* 4 Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((optionText, idx) => {
            const letter = OPTION_LETTERS[idx] || `${idx + 1}`
            const isSelected = selectedOption === idx
            const isCorrectOption = idx === currentQuestion.correct_option_index

            let optionStyle =
              "border-border/70 hover:border-primary/50 hover:bg-secondary/40 text-foreground"
            if (isSelected && !isAnswerSubmitted) {
              optionStyle = "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
            } else if (isAnswerSubmitted) {
              if (isCorrectOption) {
                optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500"
              } else if (isSelected && !isCorrectOption) {
                optionStyle = "border-rose-500 bg-rose-500/10 text-rose-300 ring-1 ring-rose-500"
              } else {
                optionStyle = "opacity-50 border-border/40 text-muted-foreground"
              }
            }

            return (
              <motion.button
                key={idx}
                type="button"
                whileTap={!isAnswerSubmitted ? { scale: 0.99 } : {}}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswerSubmitted}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${optionStyle}`}
              >
                <span
                  className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${
                    isSelected && !isAnswerSubmitted
                      ? "bg-primary text-primary-foreground border-primary"
                      : isAnswerSubmitted && isCorrectOption
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : isAnswerSubmitted && isSelected && !isCorrectOption
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-secondary/60 text-muted-foreground border-border"
                  }`}
                >
                  {letter}
                </span>

                <span className="text-sm sm:text-base leading-snug flex-1">{optionText}</span>

                {isAnswerSubmitted && isCorrectOption && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {isAnswerSubmitted && isSelected && !isCorrectOption && (
                  <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Pedagogical Explanation Reveal */}
        <AnimatePresence>
          {isAnswerSubmitted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Explication détaillée
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action button */}
        <div className="pt-2 flex justify-end">
          {!isAnswerSubmitted ? (
            <Button
              onClick={handleValidateAnswer}
              disabled={selectedOption === null}
              className="gap-2 font-medium"
            >
              Valider la réponse
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2 font-medium">
              {currentIndex < questions.length - 1 ? "Question suivante" : "Voir mon score"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
