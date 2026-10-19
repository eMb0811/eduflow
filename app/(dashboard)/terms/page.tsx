import * as React from "react";
import Link from "next/link";
import { Scale, ArrowLeft, CheckCircle2, AlertCircle, BookCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Conditions Générales d'Utilisation (CGU) | EduFlow",
  description: "Conditions Générales d'Utilisation de la plateforme d'assistance éducative EduFlow.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
          <Scale className="h-3.5 w-3.5 text-slate-500" />
          Cadre Contractuel & Légal
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Conditions Générales d'Utilisation (CGU)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          En vigueur au 11 octobre 2026
        </p>
      </div>

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookCheck className="h-4 w-4 text-slate-500" />
              1. Objet du Service
            </h2>
            <p>
              Les présentes Conditions Générales d'Utilisation régissent l'accès et l'utilisation de la plateforme <strong>EduFlow</strong> (accessible à l'adresse <code>eduflow.app</code>). EduFlow est une solution logicielle conçue pour aider les étudiants dans l'organisation de leur temps d'études, la structuration de plannings de révision et l'assistance documentaire pédagogique.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-slate-500" />
              2. Compte et Inscription
            </h2>
            <p>
              Pour bénéficier des fonctionnalités personnalisées (import d'emploi du temps, suivi des tâches, minuteur Pomodoro, quiz), l'utilisateur doit créer un compte sécurisé. L'utilisateur s'engage à fournir des informations exactes lors de la configuration de son profil académique et demeure seul responsable de la confidentialité de ses identifiants.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-slate-500" />
              3. Propriété Intellectuelle des Contenus Déposés
            </h2>
            <p>
              L'étudiant conserve l'intégralité de ses droits de propriété intellectuelle sur les cours, résumés, prises de notes et documents qu'il importe sur la plateforme. EduFlow n'acquiert aucun droit de propriété sur vos contenus académiques. L'utilisateur garantit détenir les droits nécessaires pour déposer ses supports dans le cadre de son usage personnel d'apprentissage.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-slate-500" />
              4. Nature Pédagogique de l'Assistance
            </h2>
            <p>
              EduFlow constitue un outil d'accompagnement et de soutien méthodologique. Les synthèses, fiches de révision et quiz générés visent à stimuler la compréhension mais ne sauraient se substituer aux enseignements, consignes officielles ou évaluations dispensés par votre établissement académique.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              5. Règles de Conduite et Usage Acceptable
            </h2>
            <p>Il est strictement interdit de :</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>Utiliser la plateforme pour tenter d'extraire de manière automatisée des données appartenant à d'autres étudiants.</li>
              <li>Importer des contenus illicites, diffamatoires ou contraires à l'ordre public.</li>
              <li>Perturber le bon fonctionnement de l'infrastructure ou des API sous-jacentes.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              6. Modifications et Contact
            </h2>
            <p>
              EduFlow se réserve le droit de mettre à jour les présentes CGU pour refléter les évolutions des fonctionnalités ou de la législation. Pour toute question contractuelle, écrivez à : <code>legal@eduflow.app</code>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
