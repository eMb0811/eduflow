import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, FileText, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "Conditions Générales d'Utilisation de la plateforme EduFlow.",
}

export default function CGUPage() {
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
          <FileText className="size-3.5" /> Documentation légale
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-sm text-muted-foreground">
          Dernière mise à jour : 11 octobre 2026 • Version 1.0
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Article 1 : Objet du service</h2>
          <p>
            EduFlow est une application web d&apos;organisation académique conçue pour accompagner les étudiants
            dans la gestion de leur emploi du temps, le suivi de leurs cours, la planification de révisions et
            l&apos;utilisation d&apos;outils de concentration (minuteur Pomodoro, flashcards et quiz d&apos;entraînement).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Article 2 : Accès et compte utilisateur</h2>
          <p>
            L&apos;accès au service nécessite la création d&apos;un compte personnel ou l&apos;utilisation d&apos;une session
            invitée locale. Chaque utilisateur est responsable de la confidentialité de ses identifiants et des actions
            réalisées depuis son espace de travail.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Article 3 : Contenus et documents importés</h2>
          <p>
            Les documents, emplois du temps et supports de cours déposés par l&apos;utilisateur restent sa propriété exclusive.
            L&apos;utilisateur s&apos;engage à ne pas téléverser de contenus illicites ou portant atteinte aux droits de tiers.
            EduFlow applique des contrôles de sécurité stricts (Row Level Security et compartimentage privé) garantissant
            qu&apos;aucun autre utilisateur n&apos;a accès aux documents d&apos;un tiers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Article 4 : Licence et code source</h2>
          <p>
            Le code source de la plateforme EduFlow est distribué sous licence open source libre (Licence MIT). Les utilisateurs
            sont autorisés à consulter, auditer, forker et déployer l&apos;application dans le respect des termes de ladite licence.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Article 5 : Responsabilité et exactitude</h2>
          <p>
            EduFlow constitue un outil d&apos;aide à l&apos;organisation personelle. Les plannings générés et les analyses de
            documents sont fournis à titre indicatif. L&apos;étudiant demeure seul responsable de la vérification des dates
            officielles de ses cours, examens et travaux universitaires.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Article 6 : Évolution et contact</h2>
          <p>
            Les présentes conditions peuvent être adaptées à tout moment afin de refléter l&apos;évolution des fonctionnalités.
            Pour toute question concernant l&apos;utilisation de la plateforme, vous pouvez consulter le dépôt du projet ou
            contacter l&apos;équipe de développement via GitHub.
          </p>
        </section>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground flex items-center gap-3">
        <Shield className="size-5 shrink-0 text-primary" />
        <span>
          Pour en savoir plus sur la gestion de vos données personnelles, veuillez consulter notre{" "}
          <Link href="/confidentialite" className="font-medium text-foreground underline underline-offset-4">
            Politique de Confidentialité
          </Link>.
        </span>
      </div>
    </div>
  )
}
