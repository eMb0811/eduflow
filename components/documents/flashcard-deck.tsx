"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Sparkles,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { Flashcard } from "@/types/api"

interface FlashcardDeckProps {
  flashcards: Flashcard[]
  title?: string
  onReset?: () => void
}

export function FlashcardDeck({
  flashcards,
  title = "Session de révision active",
  onReset,
}: FlashcardDeckProps) {
  const [deck, setDeck] = useState<Flashcard[]>(flashcards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [knownCardIds, setKnownCardIds] = useState<Set<string>>(new Set())
  const [reviewCardIds, setReviewCardIds] = useState<Set<string>>(new Set())

  if (!deck || deck.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed">
        <Layers className="h-10 w-10 mx-auto mb-3 opacity-40 text-primary" />
        <p>Aucune flashcard disponible pour ce cours.</p>
      </Card>
    )
  }

  const currentCard = deck[currentIndex]
  const cardId = currentCard.id || `card-${currentIndex}`
  const progressPercent = Math.round(((currentIndex + 1) / deck.length) * 100)

  const handleNext = () => {
    setIsFlipped(false)
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    setIsFlipped(false)
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleMarkKnown = () => {
    setKnownCardIds((prev) => new Set([...prev, cardId]))
    setReviewCardIds((prev) => {
      const copy = new Set(prev)
      copy.delete(cardId)
      return copy
    })
    handleNext()
  }

  const handleMarkReview = () => {
    setReviewCardIds((prev) => new Set([...prev, cardId]))
    setKnownCardIds((prev) => {
      const copy = new Set(prev)
      copy.delete(cardId)
      return copy
    })
    handleNext()
  }

  const handleShuffle = () => {
    setIsFlipped(false)
    setCurrentIndex(0)
    setDeck([...deck].sort(() => Math.random() - 0.5))
  }

  const handleRestartSession = () => {
    setIsFlipped(false)
    setCurrentIndex(0)
    setKnownCardIds(new Set())
    setReviewCardIds(new Set())
    if (onReset) onReset()
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Deck Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carte {currentIndex + 1} sur {deck.length} ({progressPercent}%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShuffle}
            className="h-8 text-xs gap-1.5"
            title="Mélanger les cartes"
          >
            <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Mélanger</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestartSession}
            className="h-8 text-xs gap-1.5"
            title="Réinitialiser"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Recommencer</span>
          </Button>
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

      {/* 3D Flippable Card */}
      <div
        className="relative h-80 sm:h-96 w-full cursor-pointer select-none perspective-1000"
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        <motion.div
          className="relative w-full h-full rounded-2xl p-6 sm:p-8 flex flex-col justify-between border shadow-lg transition-shadow duration-300 hover:shadow-xl bg-card"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FRONT */}
          <div
            className={`absolute inset-0 p-6 sm:p-8 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-card to-secondary/30 backface-hidden ${
              isFlipped ? "pointer-events-none" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                {currentCard.category || "Question"}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                Cliquez pour révéler
              </span>
            </div>

            <div className="my-auto text-center px-2 sm:px-6">
              <p className="text-lg sm:text-xl font-medium text-foreground leading-relaxed">
                {currentCard.question}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground/80 pt-3 border-t border-border/50">
              <span>Mémorisation active</span>
              <span className="text-primary font-medium">Recto ↺</span>
            </div>
          </div>

          {/* BACK */}
          <div
            className={`absolute inset-0 p-6 sm:p-8 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-indigo-950/20 via-card to-card border-indigo-500/20 backface-hidden ${
              !isFlipped ? "pointer-events-none" : ""
            }`}
            style={{ transform: "rotateY(180deg)" }}
          >
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                Réponse
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Verso
              </span>
            </div>

            <div className="my-auto text-center px-2 sm:px-6 overflow-y-auto max-h-48 py-2">
              <p className="text-base sm:text-lg font-normal text-foreground leading-relaxed">
                {currentCard.answer}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground/80 pt-3 border-t border-border/50">
              <span>Auto-évaluation</span>
              <span className="text-primary font-medium">Cliquez pour retourner</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Control Buttons */}
      <div className="space-y-3">
        {/* Active recall evaluation buttons (visible on flip) */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="grid grid-cols-2 gap-3"
            >
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkReview()
                }}
                className="h-11 border-amber-500/30 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 gap-2 font-medium"
              >
                <RotateCcw className="h-4 w-4" />
                À revoir
              </Button>

              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkKnown()
                }}
                className="h-11 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 gap-2 font-medium"
              >
                <CheckCircle2 className="h-4 w-4" />
                Je maîtrise
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="gap-1 text-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          {/* Badges count */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-medium">✓ {knownCardIds.size} maîtrisées</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-amber-400 font-medium">↺ {reviewCardIds.size} à revoir</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={currentIndex === deck.length - 1}
            className="gap-1 text-xs"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
