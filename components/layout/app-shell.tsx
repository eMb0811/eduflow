"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Sparkles,
  Timer,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useProfile } from "@/hooks/use-profile"

import { EduFlowLogo } from "@/components/ui/eduflow-logo"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/emploi-du-temps", label: "Emploi du temps", icon: CalendarDays },
  { href: "/cours", label: "Cours & Quiz", icon: BookOpen },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
  { href: "/pomodoro", label: "Pomodoro", icon: Timer },
  { href: "/profil", label: "Profil", icon: UserRound },
]

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent/60"
      aria-label="EduFlow, retour au tableau de bord"
    >
      <EduFlowLogo size={34} showText />
    </Link>
  )
}

function UserChip() {
  const { data: profile } = useProfile()
  const name = profile?.full_name ?? "Invité"
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Link
      href="/profil"
      className="flex items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-sidebar-accent"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground border border-border">
        {initials || "?"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-foreground">{name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {profile?.field_of_study ?? "Profil"}
        </span>
      </span>
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative flex min-h-dvh w-full bg-background">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Logo />
        <nav aria-label="Navigation principale" className="mt-6 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <UserChip />
            </div>
            <ThemeToggle id="theme-toggle-desktop" />
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <Link href="/cgu" className="hover:underline">CGU</Link>
            <span>•</span>
            <Link href="/confidentialite" className="hover:underline">Confidentialité</Link>
            <span>•</span>
            <span>v1.0</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
          <Logo />
          <ThemeToggle id="theme-toggle-mobile" />
        </header>

        <main id="contenu" className="flex-1 px-4 pt-6 pb-24 sm:px-6 md:px-8 md:pt-8 md:pb-12">
          <div className="mx-auto w-full max-w-6xl space-y-12">
            {children}

            <footer className="border-t border-border pt-6 pb-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© 2026 EduFlow. Tous droits réservés.</p>
              <div className="flex items-center gap-4">
                <Link href="/cgu" className="hover:text-foreground transition-colors">
                  Conditions Générales d&apos;Utilisation
                </Link>
                <span>•</span>
                <Link href="/confidentialite" className="hover:text-foreground transition-colors">
                  Politique de Confidentialité
                </Link>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-border bg-background/80 p-1.5 shadow-xl shadow-black/5 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        <ul className="grid grid-cols-6">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-active"
                      className="absolute inset-0 -z-10 rounded-xl bg-primary/10"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className="size-5" aria-hidden />
                  <span className="truncate">{label.split(" ")[0]}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
