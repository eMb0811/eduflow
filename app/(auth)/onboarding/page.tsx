"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Clock,
  Brain,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ACADEMIC_LEVELS } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";

const FIELDS_OF_STUDY = [
  "Informatique & Technologies",
  "Médecine & Santé",
  "Droit & Sciences Politiques",
  "Économie & Gestion",
  "Ingénierie & Sciences dures",
  "Lettres, Langues & Sciences Humaines",
  "Arts & Design",
  "Autre",
];

const STUDY_GOALS = [
  { id: "grades", label: "Améliorer mes notes et ma moyenne", icon: TrendingUp },
  { id: "exams", label: "Préparer mes examens et partiels", icon: Target },
  { id: "organization", label: "Mieux m'organiser au quotidien", icon: Clock },
  { id: "habits", label: "Développer de bonnes habitudes de travail", icon: Brain },
  { id: "stress", label: "Réduire le stress des révisions", icon: ShieldCheck },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [step, setStep] = React.useState<number>(1);
  const [selectedLevel, setSelectedLevel] = React.useState<string>("licence_2");
  const [selectedField, setSelectedField] = React.useState<string>("Informatique & Technologies");
  const [selectedGoals, setSelectedGoals] = React.useState<string[]>(["grades", "organization"]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep((prev) => prev + 1);
    } else {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            academic_level: selectedLevel,
            field_of_study: selectedField,
            academic_goals: selectedGoals,
            onboarding_completed: true,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Échec de l'enregistrement du profil");
        }

        await refreshProfile();
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Erreur lors de l'enregistrement de votre profil"
        );
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  return (
    <Card className="shadow-2xl border-slate-200/80 bg-white/95 backdrop-blur-sm dark:bg-slate-900/95 max-w-lg mx-auto">
      {/* Stepper visuel */}
      <div className="pt-6 px-6">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === s
                    ? "bg-slate-900 text-amber-400 ring-4 ring-amber-500/20 dark:bg-amber-500 dark:text-slate-950 dark:ring-amber-500/20"
                    : step > s
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`mx-2 h-1 flex-1 rounded transition-all ${
                    step > s ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 font-medium px-1">
          <span>Niveau</span>
          <span>Filière</span>
          <span>Objectifs</span>
        </div>
      </div>

      <CardHeader className="text-center pt-4 pb-4">
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {step === 1 && (
          <>
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-500" />
              Quel est votre niveau d&apos;études ?
            </CardTitle>
            <CardDescription>
              EduFlow adapte la complexité et les rythmes de révision
            </CardDescription>
          </>
        )}
        {step === 2 && (
          <>
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              Dans quel domaine étudiez-vous ?
            </CardTitle>
            <CardDescription>
              Pour personnaliser le tuteur IA et la génération de quiz
            </CardDescription>
          </>
        )}
        {step === 3 && (
          <>
            <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Quels sont vos objectifs majeurs ?
            </CardTitle>
            <CardDescription>
              Sélectionnez un ou plusieurs objectifs prioritaires
            </CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
            {ACADEMIC_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setSelectedLevel(level.value)}
                className={`p-3 text-left rounded-xl border text-sm font-medium transition-all active:scale-[0.98] ${
                  selectedLevel === level.value
                    ? "border-amber-500/70 bg-amber-500/[0.08] text-slate-900 ring-2 ring-amber-500/20 dark:bg-amber-500/10 dark:text-slate-100"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {FIELDS_OF_STUDY.map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => setSelectedField(field)}
                className={`p-3.5 text-left rounded-xl border text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-between ${
                  selectedField === field
                    ? "border-amber-500/70 bg-amber-500/[0.08] text-slate-900 ring-2 ring-amber-500/20 dark:bg-amber-500/10 dark:text-slate-100"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <span>{field}</span>
                {selectedField === field && (
                  <CheckCircle2 className="h-4 w-4 text-amber-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {STUDY_GOALS.map((goal) => {
              const Icon = goal.icon;
              const active = selectedGoals.includes(goal.id);
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => toggleGoal(goal.id)}
                  className={`w-full p-3.5 text-left rounded-xl border text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-between ${
                    active
                      ? "border-amber-500/70 bg-amber-500/[0.08] text-slate-900 ring-2 ring-amber-500/20 dark:bg-amber-500/10 dark:text-slate-100"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{goal.label}</span>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                      active
                        ? "border-amber-500 bg-amber-500 text-slate-950"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {active && <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            className="gap-2"
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" /> Précédent
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
            </>
          ) : step === 3 ? (
            <>
              Terminer la configuration <CheckCircle2 className="h-4 w-4" />
            </>
          ) : (
            <>
              Suivant <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
