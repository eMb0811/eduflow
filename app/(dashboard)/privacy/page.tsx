import * as React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Lock, FileText, UserCheck, Database } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Politique de Confidentialité | EduFlow",
  description: "Engagements de confidentialité et protection des données personnelles sur EduFlow.",
};

export default function PrivacyPolicyPage() {
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
          <Shield className="h-3.5 w-3.5 text-slate-500" />
          Conformité RGPD & Protection des Données
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Politique de Confidentialité
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Dernière mise à jour : 11 octobre 2026
        </p>
      </div>

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-6 sm:p-8 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-500" />
              1. Engagement et Principes Fondamentaux
            </h2>
            <p>
              Chez <strong>EduFlow</strong> (accessible via le domaine <code>eduflow.app</code>), nous accordons une importance primordiale à la protection de la vie privée des étudiants et utilisateurs de notre plateforme. Nous appliquons les principes de minimisation des données, de transparence et de sécurité stricte conformément au Règlement Général sur la Protection des Données (RGPD).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-500" />
              2. Données Collectées
            </h2>
            <p>Dans le cadre de l'utilisation de nos services, nous sommes amenés à collecter :</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
              <li><strong>Données de profil :</strong> Nom, adresse e-mail, niveau d'études, filière académique et objectifs d'apprentissage.</li>
              <li><strong>Documents académiques :</strong> Fichiers d'emplois du temps (PDF, images) et supports de cours déposés volontairement pour l'extraction OCR et la génération de révisions.</li>
              <li><strong>Données d'activité d'apprentissage :</strong> Sessions de concentration Pomodoro complétées, avancement des tâches et réponses aux quiz de révision.</li>
              <li><strong>Échanges pédagogiques :</strong> Historique des questions posées au tuteur dans le cadre strict de l'assistance aux cours.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              3. Finalité du Traitement et Confidentialité IA
            </h2>
            <p>Vos données sont exclusivement traitées pour :</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>Structurer votre emploi du temps et optimiser votre planning de révision personnalisé.</li>
              <li>Générer des fiches de synthèse, cartes mémoire et quiz adaptés à vos cours.</li>
              <li>Fournir des réponses pédagogiques contextualisées.</li>
            </ul>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 mt-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                <strong>Garantie de non-entraînement des modèles :</strong> Vos documents de cours personnels, notes et données d'échange ne sont jamais cédés à des tiers ni utilisés pour entraîner publiquement des modèles d'intelligence artificielle généraux.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-500" />
              4. Vos Droits
            </h2>
            <p>
              Conformément à la réglementation applicable, vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression intégrale de vos données. Vous pouvez à tout moment demander l'exportation ou la purge définitive de votre compte et de vos cours depuis vos paramètres ou par e-mail à : <code>privacy@eduflow.app</code>.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              5. Contact & Délégué à la Protection des Données
            </h2>
            <p>
              Pour toute question relative à cette politique ou au traitement de vos données, contactez notre équipe à l'adresse <code>support@eduflow.app</code>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
