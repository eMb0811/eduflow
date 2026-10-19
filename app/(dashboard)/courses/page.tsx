"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Upload,
  Layers,
  X,
  Search,
  Loader2,
  Trash2,
  CheckCircle2,
  Zap,
  CalendarCheck,
  ArrowRight,
  Award,
  RotateCcw,
  Timer,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Check,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flashcard } from "@/components/courses/flashcard";
import { QuizPlayer, QuizQuestion } from "@/components/courses/quiz-player";
import { KoccIcon } from "@/components/icons/kocc-icon";
import { FormattedText, stripRawMarkdown } from "@/components/ui/formatted-text";
import { usePomodoro } from "@/components/pomodoro/pomodoro-context";
import { cn } from "@/lib/utils";

interface CourseDocument {
  id: string;
  title: string;
  subject_id?: string | null;
  subject_name: string;
  subject_color: string;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
  summary?: string | null;
  key_concepts?: string[];
  flashcards_count: number;
  quizzes_count: number;
  mastery_score: number;
  created_at: string;
}

interface CourseSessionSlot {
  id: string;
  dayOfWeek: string;
  dayLabel: string;
  startTime: string;
  endTime: string;
  room?: string | null;
  professor?: string | null;
  formatted: string;
}

interface CourseSession {
  id: string;
  name: string;
  color: string;
  professor?: string | null;
  schedule_count: number;
  schedule_summary: string;
  schedule_slots: CourseSessionSlot[];
  documents_count: number;
  documents: Array<{
    id: string;
    title: string;
    file_url: string;
    file_type?: string | null;
    summary?: string | null;
    key_concepts?: string[];
    flashcards_count: number;
    quizzes_count: number;
    mastery_score: number;
    created_at: string;
  }>;
  flashcards_count: number;
  quizzes_count: number;
  mastery_score: number;
  has_source: boolean;
}

interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  difficulty: "Facile" | "Moyen" | "Difficile";
  subject?: string;
}

export default function CoursesPage() {
  const router = useRouter();
  const [sessions, setSessions] = React.useState<CourseSession[]>([]);
  const [documents, setDocuments] = React.useState<CourseDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSubject, setSelectedSubject] = React.useState<string>("ALL");
  const [uploadTargetSubject, setUploadTargetSubject] = React.useState<string | null>(null);
  const [isGeneratingPack, setIsGeneratingPack] = React.useState<string | null>(null);

  // Modales d'étude : "express" | "summary" | "flashcards" | "quiz" | null
  const [activeModal, setActiveModal] = React.useState<
    "express" | "summary" | "flashcards" | "quiz" | null
  >(null);
  const [selectedDoc, setSelectedDoc] = React.useState<CourseDocument | null>(null);

  // Étape du mode Révision Express (1: Synthèse, 2: Flashcards, 3: Quiz)
  const [expressStep, setExpressStep] = React.useState<1 | 2 | 3>(1);
  const [acquiredCardsCount, setAcquiredCardsCount] = React.useState(0);

  // États pour les Flashcards
  const [flashcards, setFlashcards] = React.useState<FlashcardItem[]>([]);
  const [flashcardIndex, setFlashcardIndex] = React.useState(0);
  const [isLoadingFlashcards, setIsLoadingFlashcards] = React.useState(false);

  // États pour le Quiz
  const [quizQuestions, setQuizQuestions] = React.useState<QuizQuestion[]>([]);
  const [isLoadingQuiz, setIsLoadingQuiz] = React.useState(false);

  // État Résumé
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(false);
  const [activeSummaryText, setActiveSummaryText] = React.useState<string | null>(null);

  // Minuteur Focus Pomodoro unifié via PomodoroContext (persistant en arrière-plan)
  const pomodoro = usePomodoro();
  const [showCourseFeynmanPrompt, setShowCourseFeynmanPrompt] = React.useState(false);
  const [courseFeynmanRecallText, setCourseFeynmanRecallText] = React.useState("");
  const [isSavingCourseRecall, setIsSavingCourseRecall] = React.useState(false);

  // Déclencher le rappel actif Feynman quand le cycle de travail se termine à 00:00
  React.useEffect(() => {
    if (pomodoro.isActive && pomodoro.mode === "work" && pomodoro.timeLeft === 0 && selectedDoc) {
      setShowCourseFeynmanPrompt(true);
    }
  }, [pomodoro.isActive, pomodoro.mode, pomodoro.timeLeft, selectedDoc]);

  // Dépôt direct 100% automatique (sans saisie manuelle)
  const [isDragging, setIsDragging] = React.useState(false);
  const [isAutoProcessing, setIsAutoProcessing] = React.useState(false);
  const [automationFeedback, setAutomationFeedback] = React.useState<{
    title: string;
    subject: string;
    message: string;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (Array.isArray(json.data.sessions)) {
            setSessions(json.data.sessions);
          }
          if (Array.isArray(json.data.documents)) {
            setDocuments(json.data.documents);
          }
        }
      } else {
        const docRes = await fetch("/api/documents");
        if (docRes.ok) {
          const docJson = await docRes.json();
          if (docJson.success && Array.isArray(docJson.data)) {
            setDocuments(docJson.data);
          }
        }
      }
    } catch (err) {
      console.error("Erreur chargement cours et sessions :", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const subjectParam = params.get("subject");
      if (subjectParam && subjectParam.trim().length > 0) {
        setSelectedSubject(subjectParam.trim());
      }
    }
    fetchData();
  }, [fetchData]);

  // Liste exhaustive des matières (issues de l'Emploi du Temps + documents)
  const subjectsList = React.useMemo(() => {
    const list: Array<{ name: string; count: number; color?: string }> = [];
    const seen = new Set<string>();

    for (const s of sessions) {
      seen.add(s.name.toLowerCase());
      list.push({
        name: s.name,
        count: s.documents_count > 0 ? s.documents_count : s.schedule_count,
        color: s.color,
      });
    }

    for (const d of documents) {
      if (d.subject_name && !seen.has(d.subject_name.toLowerCase())) {
        seen.add(d.subject_name.toLowerCase());
        list.push({
          name: d.subject_name,
          count: 1,
          color: d.subject_color,
        });
      }
    }

    return list;
  }, [sessions, documents]);

  // Filtrage des sessions et des documents avec tri : session en cours ou la plus récente en haut
  const filteredSessions = React.useMemo(() => {
    const list = sessions.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.documents.some((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSubject =
        selectedSubject === "ALL" || s.name.toLowerCase() === selectedSubject.toLowerCase();
      return matchesSearch && matchesSubject;
    });

    return [...list].sort((a, b) => {
      // 1. Priorité absolue : la session en cours d'étude (Pomodoro actif) en tout premier
      const aIsActive =
        pomodoro.isActive &&
        pomodoro.subjectName &&
        a.name.toLowerCase() === pomodoro.subjectName.toLowerCase();
      const bIsActive =
        pomodoro.isActive &&
        pomodoro.subjectName &&
        b.name.toLowerCase() === pomodoro.subjectName.toLowerCase();

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // 2. Tri par activité la plus récente (date du support le plus récent)
      const getLatestTimestamp = (s: CourseSession) => {
        if (!s.documents || s.documents.length === 0) return 0;
        return Math.max(...s.documents.map((d) => new Date(d.created_at).getTime()));
      };
      const timeA = getLatestTimestamp(a);
      const timeB = getLatestTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;

      return a.name.localeCompare(b.name);
    });
  }, [sessions, searchQuery, selectedSubject, pomodoro.isActive, pomodoro.subjectName]);

  const filteredDocs = React.useMemo(() => {
    const list = documents.filter((d) => {
      const matchesSearch =
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject =
        selectedSubject === "ALL" || d.subject_name.toLowerCase() === selectedSubject.toLowerCase();
      return matchesSearch && matchesSubject;
    });

    return [...list].sort((a, b) => {
      const aIsActive = pomodoro.isActive && pomodoro.documentId === a.id;
      const bIsActive = pomodoro.isActive && pomodoro.documentId === b.id;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [documents, searchQuery, selectedSubject, pomodoro.isActive, pomodoro.documentId]);

  // Statistiques globales de maîtrise
  const averageMastery = React.useMemo(() => {
    if (documents.length === 0) return 0;
    const sum = documents.reduce((acc, d) => acc + (d.mastery_score || 0), 0);
    return Math.round(sum / documents.length);
  }, [documents]);

  const totalFlashcardsCount = React.useMemo(() => {
    return documents.reduce((acc, d) => acc + (d.flashcards_count || 0), 0);
  }, [documents]);

  // Pipeline 100% automatique dès le dépôt d'un fichier
  const processDroppedFile = async (file: File, explicitSubject?: string) => {
    setIsAutoProcessing(true);
    setAutomationFeedback(null);

    const targetSubj =
      explicitSubject ||
      uploadTargetSubject ||
      (selectedSubject !== "ALL" ? selectedSubject : undefined);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (targetSubj) {
        formData.append("subject_name", targetSubj);
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Erreur lors de l'analyse du support");
      }

      const created: CourseDocument = json.data;
      await fetchData();

      setAutomationFeedback({
        title: created.title,
        subject: created.subject_name,
        message: `Matière « ${created.subject_name} » • ${created.flashcards_count} flashcards & quiz prêts.`,
      });
    } catch (err) {
      console.error("Erreur traitement automatique :", err);
      setAutomationFeedback({
        title: "Information d'import",
        subject: targetSubj || "Support",
        message: err instanceof Error ? err.message : "Erreur lors du traitement du support de cours",
      });
    } finally {
      setIsAutoProcessing(false);
      setUploadTargetSubject(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerUploadForSubject = (subjectName: string) => {
    setUploadTargetSubject(subjectName);
    fileInputRef.current?.click();
  };

  const handleGeneratePackForSession = async (subjectName: string, subjectId?: string) => {
    setIsGeneratingPack(subjectName);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_name: subjectName, subject_id: subjectId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchData();
        setAutomationFeedback({
          title: "Pack de Révision Kocc",
          subject: subjectName,
          message: `Pack Essentiel généré avec succès avec fiches de synthèse, flashcards et QCM pour ${subjectName}.`,
        });
      }
    } catch (err) {
      console.error("Erreur génération pack Kocc :", err);
    } finally {
      setIsGeneratingPack(null);
    }
  };

  const handleInteractWithKocc = (subjectName: string, docTitle?: string) => {
    const prompt = docTitle
      ? `Bonjour Kocc, je révise le cours de ${subjectName} (« ${docTitle} »). Peux-tu m'expliquer les points clés, vérifier ma compréhension et me tester avec des questions ciblées ?`
      : `Bonjour Kocc, je commence ma session de travail sur la matière ${subjectName} issue de mon emploi du temps. Peux-tu me faire un rappel structuré des notions fondamentales du programme et me poser une première question diagnostique ?`;

    router.push(
      `/chat?subject=${encodeURIComponent(subjectName)}&prompt=${encodeURIComponent(prompt)}`
    );
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processDroppedFile(file);
    }
  };

  const loadDocFlashcards = async (doc: CourseDocument) => {
    setIsLoadingFlashcards(true);
    try {
      const res = await fetch(`/api/documents/flashcards?document_id=${doc.id}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setFlashcards(
          json.data.map((f: any) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            difficulty:
              f.difficulty === "easy"
                ? "Facile"
                : f.difficulty === "hard"
                ? "Difficile"
                : "Moyen",
            subject: doc.subject_name,
          }))
        );
      } else {
        const genRes = await fetch("/api/documents/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: doc.id, count: 5 }),
        });
        const genJson = await genRes.json();
        if (genJson.success && Array.isArray(genJson.data?.flashcards)) {
          setFlashcards(
            genJson.data.flashcards.map((f: any, idx: number) => ({
              id: f.id || `gen-${idx}`,
              question: f.question,
              answer: f.answer,
              difficulty:
                f.difficulty === "easy"
                  ? "Facile"
                  : f.difficulty === "hard"
                  ? "Difficile"
                  : "Moyen",
              subject: doc.subject_name,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Erreur chargement flashcards :", err);
    } finally {
      setIsLoadingFlashcards(false);
    }
  };

  const loadDocQuiz = async (doc: CourseDocument) => {
    setIsLoadingQuiz(true);
    try {
      const res = await fetch(`/api/documents/quiz?document_id=${doc.id}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        const firstQuiz = json.data[0];
        setQuizQuestions(
          (firstQuiz.quiz_questions || []).map((q: any) => ({
            id: q.id,
            question: q.question,
            options: q.options || [],
            correctIndex: q.correct_answer_index,
            explanation: q.explanation || "Explication validée.",
          }))
        );
      } else {
        const genRes = await fetch("/api/documents/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: doc.id, count: 4 }),
        });
        const genJson = await genRes.json();
        if (genJson.success && Array.isArray(genJson.data?.questions)) {
          setQuizQuestions(
            genJson.data.questions.map((q: any, idx: number) => ({
              id: `q-${idx}`,
              question: q.question,
              options: q.options || [],
              correctIndex: q.correct_answer_index,
              explanation: q.explanation || "Explication validée.",
            }))
          );
        }
      }
    } catch (err) {
      console.error("Erreur chargement quiz :", err);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Lancement en 1 clic du mode Étude & Focus Pomodoro
  const startExpressRevision = async (doc: CourseDocument, autoStartPomodoro = false) => {
    setSelectedDoc(doc);
    setExpressStep(1);
    setFlashcardIndex(0);
    setAcquiredCardsCount(0);
    setActiveSummaryText(doc.summary || "Synthèse structurée du cours.");
    setActiveModal("express");
    setShowCourseFeynmanPrompt(false);
    setCourseFeynmanRecallText("");

    // Si la session est déjà en cours pour ce document ou cette matière, préserver le chrono existant
    const isSameSession =
      pomodoro.isActive &&
      (pomodoro.documentId === doc.id ||
        pomodoro.subjectName?.toLowerCase() === doc.subject_name.toLowerCase());

    if (isSameSession) {
      if (autoStartPomodoro && !pomodoro.isRunning) {
        pomodoro.resumePomodoro();
      }
    } else {
      pomodoro.startPomodoro({
        subjectName: doc.subject_name,
        documentTitle: doc.title,
        documentId: doc.id,
        durationMinutes: 25,
        autoStart: autoStartPomodoro,
      });
    }

    await Promise.all([loadDocFlashcards(doc), loadDocQuiz(doc)]);
  };

  // Ouverture automatique depuis la barre persistante ou le planning (?open=1)
  const hasAutoOpenedRef = React.useRef(false);
  React.useEffect(() => {
    if (hasAutoOpenedRef.current || documents.length === 0 || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const openParam = params.get("open");
    const subjectParam = params.get("subject");

    if (openParam === "1") {
      hasAutoOpenedRef.current = true;
      const targetDoc =
        documents.find(
          (d) =>
            (pomodoro.documentId && d.id === pomodoro.documentId) ||
            (subjectParam && d.subject_name.toLowerCase() === subjectParam.toLowerCase()) ||
            (pomodoro.subjectName &&
              d.subject_name.toLowerCase() === pomodoro.subjectName.toLowerCase())
        ) || documents[0];

      if (targetDoc && !activeModal) {
        startExpressRevision(targetDoc, false);
      }
    }
  }, [documents, pomodoro.documentId, pomodoro.subjectName, activeModal]);

  const handleManualCompleteCoursePomodoro = async () => {
    if (!selectedDoc) return;
    await pomodoro.completePomodoro();
    setShowCourseFeynmanPrompt(true);
  };

  const handleSaveCourseFeynmanRecall = async () => {
    if (!selectedDoc) return;
    setIsSavingCourseRecall(true);
    try {
      if (courseFeynmanRecallText.trim()) {
        await fetch("/api/pomodoro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duration_minutes: 25,
            type: "study",
            subject_id: selectedDoc.subject_id || undefined,
            notes: `[Rappel Feynman Cours] ${selectedDoc.subject_name} — ${courseFeynmanRecallText.trim()}`,
          }),
        });
      }
      setShowCourseFeynmanPrompt(false);
      setCourseFeynmanRecallText("");
      pomodoro.switchMode("shortBreak");
      pomodoro.resumePomodoro();
    } finally {
      setIsSavingCourseRecall(false);
    }
  };

  const handleSendCourseFeynmanToKocc = () => {
    if (!selectedDoc) return;
    const notes = courseFeynmanRecallText.trim();
    const prompt = `Bonjour Kocc, je viens de terminer une session de révision Pomodoro de 25 min sur le cours de ${selectedDoc.subject_name} (« ${selectedDoc.title} »).\nVoici ce que j'ai retenu de mémoire (rappel actif Feynman) :\n« ${notes || "Session d'étude terminée."} »\nPeux-tu valider si ma synthèse est exacte, m'indiquer les points clés que j'aurais omis et me poser une question ciblée pour consolider ma compréhension ?`;

    setShowCourseFeynmanPrompt(false);
    setActiveModal(null);
    router.push(
      `/chat?subject=${encodeURIComponent(selectedDoc.subject_name)}&prompt=${encodeURIComponent(prompt)}`
    );
  };

  const formatChrono = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const openSummary = async (doc: CourseDocument) => {
    setSelectedDoc(doc);
    setActiveModal("summary");

    if (doc.summary) {
      setActiveSummaryText(doc.summary);
    } else {
      setIsLoadingSummary(true);
      setActiveSummaryText(null);
      try {
        const res = await fetch("/api/documents/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_id: doc.id }),
        });
        const json = await res.json();
        if (json.success && json.data?.summary) {
          setActiveSummaryText(json.data.summary);
          await fetchData();
        }
      } catch (err) {
        console.error("Erreur génération résumé :", err);
      } finally {
        setIsLoadingSummary(false);
      }
    }
  };

  const openFlashcards = async (doc: CourseDocument) => {
    setSelectedDoc(doc);
    setFlashcardIndex(0);
    setActiveModal("flashcards");
    await loadDocFlashcards(doc);
  };

  const openQuiz = async (doc: CourseDocument) => {
    setSelectedDoc(doc);
    setActiveModal("quiz");
    await loadDocQuiz(doc);
  };

  // Enregistrement du score de maîtrise et synchronisation Planning si < 70%
  const handleQuizScoreCompleted = async (percentage: number) => {
    if (!selectedDoc) return;
    try {
      const res = await fetch("/api/documents/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: selectedDoc.id,
          score_percentage: percentage,
        }),
      });
      const json = await res.json();
      await fetchData();

      if (json.success && json.data?.planning_synced) {
        setAutomationFeedback({
          title: selectedDoc.title,
          subject: selectedDoc.subject_name,
          message: `Score de ${percentage}% détecté (< 70%) : Kocc a programmé automatiquement un créneau de renforcement en Priorité Haute dans votre Planning.`,
        });
      }
    } catch (err) {
      console.error("Erreur sauvegarde score :", err);
    }
  };

  const handleFlashcardSelfEval = (acquired: boolean) => {
    if (acquired) {
      setAcquiredCardsCount((prev) => prev + 1);
    }
    if (flashcardIndex < flashcards.length - 1) {
      setFlashcardIndex((prev) => prev + 1);
    } else if (activeModal === "express") {
      setExpressStep(3);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Erreur suppression :", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête Espace Étude & Révisions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Espace Étude & Révisions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Supports académiques, fiches de synthèse, flashcards, quiz et sessions focus Pomodoro
          </p>
        </div>
      </div>

      <input
        id="course-file-upload"
        name="course-file-upload"
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.doc,.docx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processDroppedFile(file, uploadTargetSubject || undefined);
        }}
        className="hidden"
      />

      {/* 1. ZONE DE DÉPÔT INTELLIGENTE DU SUPPORT DE COURS */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isAutoProcessing && fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border border-dashed px-4 py-3 transition-all duration-150 flex items-center justify-between gap-4 ${
          isDragging
            ? "border-amber-500 bg-amber-500/10"
            : "border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 hover:border-amber-500/60"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400 border border-slate-800">
            {isAutoProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {isAutoProcessing
                ? "Analyse automatique du cours en cours..."
                : uploadTargetSubject
                ? `Déposer le support pour « ${uploadTargetSubject} »`
                : selectedSubject !== "ALL"
                ? `Déposer le support pour « ${selectedSubject} »`
                : "Glissez votre support de cours ou cliquez pour importer"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              PDF, TXT, DOCX jusqu&apos;à 25 Mo • Extraction automatique de la matière, des flashcards et du quiz
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={isAutoProcessing}
          className="h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 shrink-0"
        >
          {isAutoProcessing ? "Analyse..." : "Sélectionner un fichier"}
        </Button>
      </div>

      {/* BANDEAU DE NOTIFICATION D'AUTOMATISATION KOCC */}
      {automationFeedback && (
        <div className="academic-frame bg-slate-900 text-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-amber-500/40 animate-in fade-in duration-150">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-amber-400">
              <KoccIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                {automationFeedback.title} —{" "}
                <span className="text-amber-400">{automationFeedback.subject}</span>
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                {automationFeedback.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Link href="/planning">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <CalendarCheck className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                Planning
              </Button>
            </Link>
            <button
              onClick={() => setAutomationFeedback(null)}
              className="p-1 text-slate-400 hover:text-white rounded-md"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. FILTRES PAR MATIÈRE DÉTECTÉE & RECHERCHE */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedSubject("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 shrink-0 flex items-center gap-1.5 ${
              selectedSubject === "ALL"
                ? "bg-slate-900 text-white border-slate-800 ring-1 ring-inset ring-amber-400/30 dark:bg-slate-800"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            Toutes ({subjectsList.length})
          </button>

          {subjectsList.map((subj) => {
            const isActive = selectedSubject.toLowerCase() === subj.name.toLowerCase();
            return (
              <button
                key={subj.name}
                onClick={() => setSelectedSubject(subj.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-800 ring-1 ring-inset ring-amber-400/30 dark:bg-slate-800"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <span>{subj.name}</span>
                <span className="text-[10px] opacity-75">({subj.count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Input
            id="course-search-filter"
            name="course-search-filter"
            type="text"
            placeholder="Filtrer un cours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800"
          />
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* BANDEAU SESSION FOCUS EN COURS (POUR NE PAS SE PERDRE) */}
      {pomodoro.isActive && pomodoro.subjectName && (
        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-3 sm:p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Timer className="h-5 w-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-sm">
                  Session en cours
                </span>
                <span className="text-xs font-bold text-white truncate">
                  {pomodoro.subjectName}
                  {pomodoro.documentTitle && ` • ${pomodoro.documentTitle}`}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Temps restant : <strong className="text-amber-400 font-mono">{formatChrono(pomodoro.timeLeft)}</strong> • Le chrono continue même si vous quittez ou parlez à Kocc
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const targetDoc = documents.find(
                  (d) =>
                    (pomodoro.documentId && d.id === pomodoro.documentId) ||
                    d.subject_name.toLowerCase() === pomodoro.subjectName?.toLowerCase()
                );
                if (targetDoc) {
                  startExpressRevision(targetDoc, false);
                }
              }}
              className="h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1.5 cursor-pointer shadow-xs"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Reprendre la révision</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleInteractWithKocc(pomodoro.subjectName || "", pomodoro.documentTitle || undefined)}
              className="h-8 px-2.5 text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-amber-400 mr-1" />
              <span>Kocc</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. GRILLE DES SESSIONS DE COURS & SUPPORTS */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card className="h-56 animate-pulse bg-slate-100 dark:bg-slate-800" />
          <Card className="h-56 animate-pulse bg-slate-100 dark:bg-slate-800" />
          <Card className="h-56 animate-pulse bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : filteredSessions.length === 0 && filteredDocs.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <FileText className="mx-auto h-9 w-9 text-slate-400 mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Aucune session ou cours trouvé pour ce filtre
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Importez votre emploi du temps pour synchroniser automatiquement vos matières, ou déposez un fichier directement.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* A. SESSIONS GÉNÉRÉES DEPUIS L'EMPLOI DU TEMPS */}
          {filteredSessions.map((session) => {
            const matchingDocs = filteredDocs.filter(
              (d) => d.subject_name.toLowerCase() === session.name.toLowerCase()
            );

            // Si la session a des documents de cours importés, on affiche chaque document + carte pour ajouter le chapitre suivant
            if (matchingDocs.length > 0) {
              return (
                <React.Fragment key={`session-group-${session.id}`}>
                  {matchingDocs.map((doc, docIdx) => {
                    const mastery = doc.mastery_score || 0;
                    const masteryBadgeColor =
                      mastery >= 75
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                        : mastery >= 50
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                        : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25";

                    const masteryLabel =
                      mastery >= 75
                        ? "Maîtrisé"
                        : mastery >= 50
                        ? "En consolidation"
                        : "À renforcer";

                    const isDocPomodoroActive =
                      pomodoro.isActive &&
                      (pomodoro.documentId === doc.id ||
                        (!pomodoro.documentId &&
                          pomodoro.subjectName?.toLowerCase() === doc.subject_name.toLowerCase()));

                    return (
                      <div
                        key={doc.id}
                        onClick={() => startExpressRevision(doc, false)}
                        className={cn(
                          "academic-card-interactive flex flex-col justify-between group cursor-pointer transition-all duration-150",
                          isDocPomodoroActive
                            ? "border-amber-500 ring-2 ring-amber-500/50 shadow-md shadow-amber-500/10 bg-amber-500/[0.03]"
                            : "hover:border-amber-500/60 hover:shadow-md"
                        )}
                      >
                        <div
                          className="h-1 w-full transition-opacity duration-200 opacity-85 group-hover:opacity-100"
                          style={{ backgroundColor: doc.subject_color || session.color || "#4F46E5" }}
                        />

                        <CardHeader className="pb-2.5 pt-3.5">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: doc.subject_color || session.color || "#4F46E5" }}
                              />
                              {doc.subject_name}
                              {matchingDocs.length > 1 && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono ml-0.5">
                                  Ch. {docIdx + 1}
                                </span>
                              )}
                            </span>

                            <div className="flex items-center gap-1">
                              {isDocPomodoroActive ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs animate-pulse">
                                  <Timer className="h-3 w-3" />
                                  En cours ({formatChrono(pomodoro.timeLeft)})
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${masteryBadgeColor}`}
                                >
                                  {masteryLabel} • {mastery}%
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDocument(doc.id);
                                }}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md"
                                title="Supprimer ce cours"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <CardTitle className="text-base font-bold leading-snug text-slate-900 dark:text-white line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {doc.title}
                          </CardTitle>
                          <CardDescription className="text-[11px] flex flex-wrap items-center gap-2 pt-0.5">
                            <span>{doc.flashcards_count} flashcards</span>
                            <span>•</span>
                            <span>Quiz inclus</span>
                            {session.schedule_count > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-700 dark:text-amber-400 font-medium">
                                  {session.schedule_count} séance{session.schedule_count > 1 ? "s" : ""}/sem.
                                </span>
                              </>
                            )}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="pb-3 space-y-2.5">
                          {Array.isArray(doc.key_concepts) && doc.key_concepts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {doc.key_concepts.slice(0, 3).map((concept, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 truncate max-w-full"
                                >
                                  {stripRawMarkdown(concept)}
                                </span>
                              ))}
                            </div>
                          )}

                          <Progress value={mastery} className="h-1.5" />
                        </CardContent>

                        <CardFooter className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span>{isDocPomodoroActive ? "Reprendre la révision" : "Réviser ce cours"}</span>
                            <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-amber-500" />
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleInteractWithKocc(doc.subject_name, doc.title)}
                              className="h-8 px-2.5 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-500/30 text-xs font-semibold cursor-pointer"
                              title="Poser des questions à Kocc sur ce cours"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                              <span className="hidden sm:inline">Kocc</span>
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => triggerUploadForSubject(doc.subject_name)}
                              className="h-8 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                              title={`Ajouter un autre chapitre à ${doc.subject_name}`}
                            >
                              <Plus className="h-3.5 w-3.5 text-amber-500" />
                              <span className="sr-only">Nouveau chapitre</span>
                            </Button>
                          </div>
                        </CardFooter>
                      </div>
                    );
                  })}

                  {/* Carte d'action : Ajouter un autre chapitre à cette matière */}
                  <div
                    onClick={() => triggerUploadForSubject(session.name)}
                    className="academic-card-interactive flex flex-col items-center justify-center p-6 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500/70 hover:bg-amber-500/[0.03] text-center cursor-pointer min-h-[220px] transition-all group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-500/10 border border-slate-200 dark:border-slate-700 transition-colors mb-2">
                      <Plus className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      Ajouter un autre chapitre
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Matière : <span className="font-semibold text-slate-700 dark:text-slate-300">{session.name}</span>
                    </p>
                    <span className="mt-3 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:underline">
                      <Upload className="h-3 w-3" /> Importer le support
                    </span>
                  </div>
                </React.Fragment>
              );
            }

            // Si la session n'a PAS ENCORE de document importé, on affiche sa carte de session active prête à recevoir des supports
            return (
              <div
                key={`session-${session.id}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processDroppedFile(file, session.name);
                }}
                className="academic-card-interactive flex flex-col justify-between group border-dashed hover:border-amber-500/70"
              >
                <div
                  className="h-1.5 w-full transition-opacity duration-200 opacity-90 group-hover:opacity-100"
                  style={{ backgroundColor: session.color || "#4F46E5" }}
                />

                <CardHeader className="pb-2.5 pt-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: session.color || "#4F46E5" }}
                      />
                      {session.name}
                    </span>

                    <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 font-semibold">
                      Session EDT
                    </Badge>
                  </div>

                  <CardTitle className="text-base font-bold leading-snug text-slate-900 dark:text-white">
                    {session.name}
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-500 pt-0.5 line-clamp-2">
                    {session.schedule_summary}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-3 space-y-2.5">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Session synchronisée avec l&apos;emploi du temps
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Déposez votre support de cours (PDF, cours, TD) ou révisez directement avec Kocc.
                    </p>
                  </div>

                  {session.schedule_slots && session.schedule_slots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {session.schedule_slots.map((slot, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                        >
                          {slot.formatted}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => triggerUploadForSubject(session.name)}
                    disabled={isAutoProcessing}
                    className="flex-1 gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold h-9 truncate cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Déposer le support</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleInteractWithKocc(session.name)}
                    className="h-9 px-3 gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold shrink-0 cursor-pointer"
                    title={`Discuter avec Kocc sur ${session.name}`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Kocc Tuteur</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleGeneratePackForSession(session.name, session.id)}
                    disabled={isGeneratingPack === session.name}
                    className="h-9 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Générer un pack d'étude Kocc sans PDF"
                  >
                    {isGeneratingPack === session.name ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </Button>
                </CardFooter>
              </div>
            );
          })}

          {/* B. SUPPORTS ORPHELINS OU GÉNÉRAUX QUI NE CORRESPONDENT PAS À UNE SESSION DE L'EDT */}
          {filteredDocs
            .filter(
              (doc) =>
                !filteredSessions.some(
                  (s) => s.name.toLowerCase() === doc.subject_name.toLowerCase()
                )
            )
            .map((doc) => {
              const mastery = doc.mastery_score || 0;
              const masteryBadgeColor =
                mastery >= 75
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                  : mastery >= 50
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                  : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25";

              const masteryLabel =
                mastery >= 75
                  ? "Maîtrisé"
                  : mastery >= 50
                  ? "En consolidation"
                  : "À renforcer";

              const isDocPomodoroActive =
                pomodoro.isActive &&
                (pomodoro.documentId === doc.id ||
                  (!pomodoro.documentId &&
                    pomodoro.subjectName?.toLowerCase() === doc.subject_name.toLowerCase()));

              return (
                <div
                  key={doc.id}
                  onClick={() => startExpressRevision(doc, false)}
                  className={cn(
                    "academic-card-interactive flex flex-col justify-between group cursor-pointer transition-all duration-150",
                    isDocPomodoroActive
                      ? "border-amber-500 ring-2 ring-amber-500/50 shadow-md shadow-amber-500/10 bg-amber-500/[0.03]"
                      : "hover:border-amber-500/60 hover:shadow-md"
                  )}
                >
                  <div
                    className="h-1 w-full transition-opacity duration-200 opacity-85 group-hover:opacity-100"
                    style={{ backgroundColor: doc.subject_color || "#4F46E5" }}
                  />

                  <CardHeader className="pb-2.5 pt-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: doc.subject_color || "#4F46E5" }}
                        />
                        {doc.subject_name}
                      </span>

                      <div className="flex items-center gap-1">
                        {isDocPomodoroActive ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs animate-pulse">
                            <Timer className="h-3 w-3" />
                            En cours ({formatChrono(pomodoro.timeLeft)})
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${masteryBadgeColor}`}
                          >
                            {masteryLabel} • {mastery}%
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id);
                          }}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md"
                          title="Supprimer ce cours"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <CardTitle className="text-base font-bold leading-snug text-slate-900 dark:text-white line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="text-[11px] flex flex-wrap items-center gap-2 pt-0.5">
                      <span>{doc.flashcards_count} flashcards</span>
                      <span>•</span>
                      <span>Quiz inclus</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pb-3 space-y-2.5">
                    {Array.isArray(doc.key_concepts) && doc.key_concepts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {doc.key_concepts.slice(0, 3).map((concept, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 truncate max-w-full"
                          >
                            {stripRawMarkdown(concept)}
                          </span>
                        ))}
                      </div>
                    )}

                    <Progress value={mastery} className="h-1.5" />
                  </CardContent>

                  <CardFooter className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{isDocPomodoroActive ? "Reprendre la révision" : "Réviser ce cours"}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-amber-500" />
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInteractWithKocc(doc.subject_name, doc.title)}
                        className="h-8 px-2.5 gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-500/30 text-xs font-semibold cursor-pointer"
                        title="Poser des questions à Kocc sur ce cours"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                        <span className="hidden sm:inline">Kocc</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => triggerUploadForSubject(doc.subject_name)}
                        className="h-8 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                        title={`Ajouter un autre chapitre à ${doc.subject_name}`}
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-500" />
                        <span className="sr-only">Nouveau chapitre</span>
                      </Button>
                    </div>
                  </CardFooter>
                </div>
              );
            })}
        </div>
      )}

      {/* 4. MODALE UNIFIÉE D'ÉTUDE EN 3 ONGLETS (SYNTHÈSE, FLASHCARDS, QUIZ) */}
      {activeModal === "express" && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl rounded-xl border border-slate-300 dark:border-slate-700 ring-1 ring-inset ring-white/10 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4 mb-4 sm:mb-5">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-900 text-amber-400 border border-slate-700">
                    {selectedDoc.subject_name}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">
                  {selectedDoc.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* BANDEAU STICKY FOCUS POMODORO INTÉGRÉ AU COURS */}
            <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 mb-4 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-y border-amber-500/30 text-white flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Timer className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Focus Pomodoro
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ({pomodoro.mode === "work" ? "Session 25 min" : "Pause 5 min"})
                    </span>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 hidden md:inline">
                      Persistant
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 hidden sm:block">
                    Le chrono continue même si vous fermez ce panneau ou si vous échangez avec Kocc
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-sm sm:text-base font-extrabold text-amber-400 tracking-wider">
                  {formatChrono(pomodoro.timeLeft)}
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={pomodoro.isRunning ? pomodoro.pausePomodoro : pomodoro.resumePomodoro}
                  className="h-8 px-3 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1.5 shadow-xs cursor-pointer"
                >
                  {pomodoro.isRunning ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{pomodoro.timeLeft === (pomodoro.mode === "work" ? 25 * 60 : 5 * 60) ? "Démarrer" : "Reprendre"}</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={pomodoro.resetPomodoro}
                  className="h-8 w-8 border-slate-700 bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="Réinitialiser"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualCompleteCoursePomodoro}
                  className="h-8 px-2.5 text-[11px] border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white cursor-pointer font-semibold"
                  title="Valider la session et débriefer"
                >
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  <span className="hidden md:inline">Terminer &amp;</span> Débriefer
                </Button>
              </div>
            </div>

            {/* DÉBRIEFING FEYNMAN POST-POMODORO DU COURS */}
            {showCourseFeynmanPrompt && (
              <div className="mb-5 p-4 rounded-xl sm:rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Débriefing Feynman du cours — Rappel Actif</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pour ancrer durablement ce chapitre dans votre mémoire à long terme, résumez en 1 ou 2 phrases ce que vous venez d&apos;apprendre sur « <strong>{selectedDoc.title}</strong> » sans consulter la fiche.
                </p>

                <textarea
                  value={courseFeynmanRecallText}
                  onChange={(e) => setCourseFeynmanRecallText(e.target.value)}
                  placeholder="Exemple : J'ai retenu la définition clé, les étapes principales et la condition d'arrêt..."
                  rows={2}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 hover:border-slate-400 transition-all duration-150 resize-none"
                />

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleSendCourseFeynmanToKocc}
                    className="w-full sm:w-auto flex-1 gap-2 bg-slate-900 hover:bg-slate-800 text-amber-400 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 font-semibold text-xs h-9 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Faire valider ma synthèse par Kocc
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSavingCourseRecall}
                    onClick={handleSaveCourseFeynmanRecall}
                    className="w-full sm:w-auto text-xs h-9 border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                    Enregistrer mon ancrage & Continuer
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCourseFeynmanPrompt(false);
                      pomodoro.switchMode("shortBreak");
                    }}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer"
                  >
                    Passer en pause
                  </button>
                </div>
              </div>
            )}

            {/* Navigation directe entre les 3 modes d'étude */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 sm:mb-6">
              {[
                { step: 1, full: "1. Fiche de synthèse", short: "1. Synthèse" },
                { step: 2, full: "2. Flashcards actives", short: "2. Cartes" },
                { step: 3, full: "3. Quiz de validation", short: "3. Quiz" },
              ].map((item) => {
                const isCurrent = expressStep === item.step;
                const isDone = expressStep > item.step;
                return (
                  <button
                    key={item.step}
                    onClick={() => setExpressStep(item.step as 1 | 2 | 3)}
                    className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold border text-left flex items-center justify-between transition-all touch-manipulation ${
                      isCurrent
                        ? "bg-slate-900 text-white border-slate-800 ring-1 ring-inset ring-amber-400/30"
                        : isDone
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <span className="hidden sm:inline truncate">{item.full}</span>
                    <span className="sm:hidden truncate">{item.short}</span>
                    {isDone && (
                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ONGLET 1 : SYNTHÈSE */}
            {expressStep === 1 && (
              <div className="space-y-5">
                {Array.isArray(selectedDoc.key_concepts) &&
                  selectedDoc.key_concepts.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Concepts fondamentaux à retenir
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDoc.key_concepts.map((c, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                          >
                            {stripRawMarkdown(c)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                  <FormattedText text={activeSummaryText || selectedDoc.summary} />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setExpressStep(2)}
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Passer aux Flashcards ({flashcards.length})
                    <ArrowRight className="h-4 w-4 text-amber-400" />
                  </Button>
                </div>
              </div>
            )}

            {/* ONGLET 2 : FLASHCARDS */}
            {expressStep === 2 && (
              <div className="space-y-5">
                {isLoadingFlashcards ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    <p className="text-sm text-slate-500">Chargement des cartes mémoires...</p>
                  </div>
                ) : flashcards.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">
                    Aucune flashcard disponible.
                  </p>
                ) : (
                  <>
                    <Flashcard
                      id={flashcards[flashcardIndex].id}
                      question={flashcards[flashcardIndex].question}
                      answer={flashcards[flashcardIndex].answer}
                      subject={selectedDoc.subject_name}
                      difficulty={flashcards[flashcardIndex].difficulty}
                      onMastered={() => handleFlashcardSelfEval(true)}
                      onReviewLater={() => handleFlashcardSelfEval(false)}
                    />

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs text-slate-500">
                        Carte {flashcardIndex + 1}/{flashcards.length} ({acquiredCardsCount} acquises)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpressStep(3)}
                        className="text-xs h-8"
                      >
                        Aller au Quiz <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ONGLET 3 : QUIZ */}
            {expressStep === 3 && (
              <div>
                {isLoadingQuiz ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    <p className="text-sm text-slate-500">Préparation du quiz...</p>
                  </div>
                ) : quizQuestions.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">
                    Aucune question disponible.
                  </p>
                ) : (
                  <QuizPlayer
                    title={selectedDoc.title}
                    subject={selectedDoc.subject_name}
                    questions={quizQuestions}
                    onComplete={handleQuizScoreCompleted}
                    onUploadNextChapter={() => {
                      const subjectName = selectedDoc.subject_name;
                      setActiveModal(null);
                      triggerUploadForSubject(subjectName);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
