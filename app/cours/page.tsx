"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  BookOpen,
  Sparkles,
  Layers,
  HelpCircle,
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  BookMarked,
  Brain,
  ListChecks,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FlashcardDeck } from "@/components/documents/flashcard-deck"
import { QuizRunner } from "@/components/documents/quiz-runner"
import {
  useDocuments,
  useSummarizeDocument,
  useGenerateFlashcards,
  useGenerateQuiz,
} from "@/hooks/use-documents"
import {
  SAMPLE_COURSES,
  SAMPLE_SUMMARIES,
  SAMPLE_FLASHCARDS,
  SAMPLE_QUIZZES,
  type SampleCourseDoc,
} from "@/lib/mocks/documents"
import type { DocumentSummary, Flashcard, QuizResponse } from "@/types/api"

export default function CoursPage() {
  const { createDocument } = useDocuments()
  const { summarize, isSummarizing } = useSummarizeDocument()
  const { generate: generateFlashcards, isGenerating: isGeneratingFlashcards } = useGenerateFlashcards()
  const { generate: generateQuiz, isGenerating: isGeneratingQuiz } = useGenerateQuiz()

  // Selected course state
  const [selectedCourse, setSelectedCourse] = useState<SampleCourseDoc>(SAMPLE_COURSES[0])
  const [activeTab, setActiveTab] = useState<string>("summary")

  // Per-course cached results pre-seeded for instantaneous rich UX
  const [summaries, setSummaries] = useState<Record<string, DocumentSummary>>(SAMPLE_SUMMARIES)
  const [flashcardDecks, setFlashcardDecks] = useState<Record<string, Flashcard[]>>(SAMPLE_FLASHCARDS)
  const [quizzes, setQuizzes] = useState<Record<string, QuizResponse>>(SAMPLE_QUIZZES)

  // New course modal state
  const [isNewDocOpen, setIsNewDocOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSubject, setNewSubject] = useState("")
  const [newContent, setNewContent] = useState("")

  const activeSummary = summaries[selectedCourse.id]
  const activeDeck = flashcardDecks[selectedCourse.id]
  const activeQuiz = quizzes[selectedCourse.id]

  const handleGenerateSummary = async () => {
    try {
      toast.info("Génération de la synthèse d'étude...")
      const res = await summarize({
        text: selectedCourse.content,
        titleHint: selectedCourse.title,
      })
      setSummaries((prev) => ({ ...prev, [selectedCourse.id]: res }))
      toast.success("Synthèse d'étude générée avec succès !")
      setActiveTab("summary")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération du résumé")
    }
  }

  const handleGenerateFlashcards = async () => {
    try {
      toast.info("Création des flashcards de mémorisation active...")
      const res = await generateFlashcards({
        text: selectedCourse.content,
        count: 8,
        subjectHint: selectedCourse.subject,
      })
      setFlashcardDecks((prev) => ({ ...prev, [selectedCourse.id]: res }))
      toast.success(`${res.length} flashcards générées avec succès !`)
      setActiveTab("flashcards")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération des flashcards")
    }
  }

  const handleGenerateQuiz = async () => {
    try {
      toast.info("Génération du quiz d'auto-évaluation...")
      const res = await generateQuiz({
        text: selectedCourse.content,
        count: 5,
        difficulty: "moyen",
        topicHint: selectedCourse.subject,
      })
      setQuizzes((prev) => ({ ...prev, [selectedCourse.id]: res }))
      toast.success("Quiz prêt à être démarré !")
      setActiveTab("quiz")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la génération du quiz")
    }
  }

  const handleAddCustomCourse = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Veuillez renseigner un titre et le contenu du cours.")
      return
    }

    const newDoc: SampleCourseDoc = {
      id: `custom-doc-${Date.now()}`,
      title: newTitle.trim(),
      subject: newSubject.trim() || "Général",
      color: "#8b5cf6",
      excerpt: newContent.slice(0, 120) + "...",
      content: newContent.trim(),
    }

    try {
      await createDocument({
        title: newDoc.title,
        file_url: `https://example.com/custom/${newDoc.id}`,
      })
    } catch {
      // Local dev fallback handles this
    }

    SAMPLE_COURSES.unshift(newDoc)
    setSelectedCourse(newDoc)
    setNewTitle("")
    setNewSubject("")
    setNewContent("")
    setIsNewDocOpen(false)
    toast.success("Nouveau cours ajouté avec succès !")
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <BookOpen className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Cours & Révisions
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Générez des synthèses d’étude approfondies, des flashcards de mémorisation active et des quiz
            d’auto-évaluation.
          </p>
        </div>

        {/* Modal to add course */}
        <Dialog open={isNewDocOpen} onOpenChange={setIsNewDocOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Nouveau cours / Notes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Ajouter un support de cours
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Titre du cours</label>
                <Input
                  placeholder="Ex : Réseaux : Modèle OSI & Protocole TCP"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Matière</label>
                <Input
                  placeholder="Ex : Télécommunications"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Texte ou notes de cours (au moins 20 caractères)
                </label>
                <Textarea
                  placeholder="Collez ici le texte du cours, les définitions ou les notes de TD..."
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="mt-1 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsNewDocOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddCustomCourse}>Enregistrer le cours</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courses selector pills */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <BookMarked className="h-3.5 w-3.5 text-primary" />
          Supports de cours disponibles ({SAMPLE_COURSES.length})
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SAMPLE_COURSES.map((doc) => {
            const isSelected = selectedCourse.id === doc.id
            return (
              <motion.button
                key={doc.id}
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedCourse(doc)}
                className={`text-left p-4 rounded-xl border transition-all space-y-2 ${
                  isSelected
                    ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary"
                    : "border-border/70 hover:border-border bg-card/60 hover:bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-medium" style={{ borderColor: doc.color, color: doc.color }}>
                    {doc.subject}
                  </Badge>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{doc.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{doc.excerpt}</p>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Main Study Hub */}
      <Card className="p-6 sm:p-8 space-y-6 border shadow-xl bg-card">
        {/* Selected Course Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {selectedCourse.subject}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {selectedCourse.content.length} caractères • ~{Math.round(selectedCourse.content.split(/\s+/).length)} mots
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {selectedCourse.title}
            </h2>
          </div>

          {/* Quick AI Action triggers */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateSummary}
              disabled={isSummarizing}
              className="gap-1.5 text-xs h-9 border-primary/30 hover:bg-primary/10"
            >
              {isSummarizing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
              {activeSummary ? "Régénérer synthèse" : "Générer synthèse"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateFlashcards}
              disabled={isGeneratingFlashcards}
              className="gap-1.5 text-xs h-9 border-indigo-500/30 hover:bg-indigo-500/10"
            >
              {isGeneratingFlashcards ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              ) : (
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
              )}
              {activeDeck ? "Régénérer cartes" : "Générer flashcards"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateQuiz}
              disabled={isGeneratingQuiz}
              className="gap-1.5 text-xs h-9 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              {isGeneratingQuiz ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              ) : (
                <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {activeQuiz ? "Régénérer quiz" : "Générer quiz"}
            </Button>
          </div>
        </div>

        {/* Tabbed interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md h-10 p-1 bg-secondary/50">
            <TabsTrigger value="summary" className="text-xs gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              Synthèse
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="text-xs gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Flashcards
            </TabsTrigger>
            <TabsTrigger value="quiz" className="text-xs gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="source" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Source
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SUMMARY */}
          <TabsContent value="summary" className="space-y-6 outline-none">
            {isSummarizing ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm font-medium text-foreground">Analyse cognitive du cours en cours...</p>
                <p className="text-xs text-muted-foreground">Extraction des concepts fondamentaux et structuration de la synthèse.</p>
              </div>
            ) : activeSummary ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Overview Card */}
                <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" />
                    Vue d’ensemble
                  </div>
                  <p className="text-sm sm:text-base text-foreground leading-relaxed font-medium">
                    {activeSummary.overview}
                  </p>
                </div>

                {/* Key Concepts */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Concepts Clés & Définitions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeSummary.key_concepts.map((kc, idx) => (
                      <div key={idx} className="p-4 rounded-xl border bg-secondary/30 space-y-1.5">
                        <span className="text-xs font-bold text-primary">{kc.concept}</span>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {kc.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed Summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Synthèse Détaillée
                  </h3>
                  <div className="p-5 rounded-xl border bg-card text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                    {activeSummary.detailed_summary}
                  </div>
                </div>

                {/* Key Takeaways */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Points Essentiels à Retenir pour l’Examen
                  </h3>
                  <div className="space-y-2">
                    {activeSummary.key_takeaways.map((takeaway, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg border bg-secondary/20 text-xs sm:text-sm">
                        <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-foreground">{takeaway}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="py-14 text-center space-y-4 border rounded-xl border-dashed">
                <Brain className="h-10 w-10 mx-auto text-primary opacity-60" />
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">Aucune synthèse générée</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Cliquez sur le bouton ci-dessous pour générer la synthèse de ce cours.
                  </p>
                </div>
                <Button onClick={handleGenerateSummary} className="gap-2 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Générer la synthèse d’étude
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: FLASHCARDS */}
          <TabsContent value="flashcards" className="space-y-6 outline-none">
            {isGeneratingFlashcards ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-400" />
                <p className="text-sm font-medium text-foreground">Création de vos flashcards en cours...</p>
                <p className="text-xs text-muted-foreground">Génération de questions atomiques pour répétition espacée.</p>
              </div>
            ) : activeDeck && activeDeck.length > 0 ? (
              <FlashcardDeck flashcards={activeDeck} title={`Flashcards : ${selectedCourse.title}`} />
            ) : (
              <div className="py-14 text-center space-y-4 border rounded-xl border-dashed">
                <Layers className="h-10 w-10 mx-auto text-indigo-400 opacity-60" />
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">Aucune flashcard créée</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Générez une série de cartes mémoires interactives pour tester votre mémorisation active.
                  </p>
                </div>
                <Button onClick={handleGenerateFlashcards} className="gap-2 text-xs">
                  <Layers className="h-3.5 w-3.5" />
                  Créer les flashcards
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: QUIZ */}
          <TabsContent value="quiz" className="space-y-6 outline-none">
            {isGeneratingQuiz ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-400" />
                <p className="text-sm font-medium text-foreground">Création du QCM interactif en cours...</p>
                <p className="text-xs text-muted-foreground">Rédaction de 5 questions formatrices avec explications détaillées.</p>
              </div>
            ) : activeQuiz ? (
              <QuizRunner quiz={activeQuiz} />
            ) : (
              <div className="py-14 text-center space-y-4 border rounded-xl border-dashed">
                <HelpCircle className="h-10 w-10 mx-auto text-emerald-400 opacity-60" />
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">Aucun quiz généré</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Générez un QCM à 4 options avec correction immédiate pour valider votre compréhension.
                  </p>
                </div>
                <Button onClick={handleGenerateQuiz} className="gap-2 text-xs">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Lancer le quiz
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 4: RAW SOURCE */}
          <TabsContent value="source" className="space-y-4 outline-none">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                Contenu original du cours
              </span>
              <Badge variant="outline" className="text-xs">
                Format texte brut
              </Badge>
            </div>
            <div className="p-5 rounded-xl border bg-secondary/20 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {selectedCourse.content}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
