import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Politique de Confidentialité",
  description: "Politique de confidentialité et protection des données d'EduFlow.",
}

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4 sm:py-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-md gap-1.5 text-xs">
          <Link href="/">
            <ArrowLeft className="size-4" /> Retour
          </Link>
        </Button>
      </div>

      <div className="space-y-2 border-b border-border pb-6">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Protection des données
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Politique de Confidentialité</h1>
        <p className="text-sm text-muted-foreground">
          Conformité RGPD • Aucune revente de données • Données privées
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Engagement de principe</h2>
          <p>
            La protection de votre vie privée et de vos données académiques est une exigence absolue pour EduFlow.
            Nous appliquons une politique de minimisation stricte : seules les données nécessaires à votre organisation
            d&apos;études sont collectées, et elles ne font l&apos;objet d&apos;aucun profilage commercial ni d&apos;aucune revente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Données collectées</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">Données d&apos;identification :</strong> adresse email, nom et filière d&apos;études
              (utilisés exclusivement pour l&apos;authentification et la personnalisation de votre espace).
            </li>
            <li>
              <strong className="text-foreground">Données d&apos;organisation :</strong> cours hebdomadaires, dates d&apos;examens et
              plannings d&apos;étude.
            </li>
            <li>
              <strong className="text-foreground">Documents académiques :</strong> supports de cours et images d&apos;emplois du temps
              déposés par vous-même dans votre espace sécurisé.
            </li>
            <li>
              <strong className="text-foreground">Métriques d&apos;étude :</strong> historique de vos sessions de travail Pomodoro,
              résultats de vos quiz personnels et maîtrise de vos flashcards.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Sécurité technique et Row Level Security (RLS)</h2>
          <p>
            Toutes les informations sont stockées dans une base de données PostgreSQL isolée au moyen de politiques
            strictes de sécurité au niveau des lignes (Row Level Security). Cela signifie qu&apos;au niveau même du moteur
            de données, chaque requête est systématiquement verrouillée à votre propre identifiant d&apos;authentification.
            Aucun tiers ni aucun autre utilisateur ne peut accéder à vos documents ou plannings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Traitement des documents</h2>
          <p>
            Les documents analysés pour générer vos résumés, quiz et plannings sont traités de manière éphémère et
            sécurisée. Ils ne sont ni partagés, ni indexés publiquement, ni utilisés pour réentraîner des modèles
            publics.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Vos droits (Accès, Rectification, Suppression)</h2>
          <p>
            Conformément à la réglementation sur la protection des données (RGPD), vous disposez à tout moment du droit
            d&apos;accès, de rectification, d&apos;exportation et de suppression définitive de l&apos;ensemble de vos données
            depuis votre page Profil ou sur simple demande.
          </p>
        </section>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground flex items-center gap-3">
        <Lock className="size-5 shrink-0 text-primary" />
        <span>
          Pour toute question relative à l&apos;exercice de vos droits ou pour demander la suppression de votre compte,
          consultez nos{" "}
          <Link href="/cgu" className="font-medium text-foreground underline underline-offset-4">
            Conditions Générales d&apos;Utilisation
          </Link>.
        </span>
      </div>
    </div>
  )
}
