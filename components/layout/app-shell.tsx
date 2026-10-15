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
  { href: "/assistant", label: "Assistant IA", icon: Sparkles },
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
      <EduFlowLogo size={32} showText />
    </Link>
  )
}

function CompactLogo() {
  return (
    <Link
      href="/"
      className="group relative flex size-11 items-center justify-center rounded-xl transition-all hover:bg-sidebar-accent/60"
      aria-label="EduFlow, retour au tableau de bord"
    >
      <EduFlowLogo size={32} showText={false} />
      <span className="pointer-events-none absolute left-full ml-3 hidden rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-semibold text-popover-foreground shadow-md group-hover:flex whitespace-nowrap z-50">
        EduFlow
      </span>
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: profile } = useProfile()
  const name = profile?.full_name ?? "Fatou Ndiaye"
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="relative flex min-h-dvh w-full bg-background">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>

      {/* Desktop Compact Sidebar Rail (68px) */}
      <aside className="sticky top-0 hidden h-dvh w-[68px] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-4 px-2 md:flex">
        <CompactLogo />

        <nav aria-label="Navigation principale" className="mt-6 flex flex-1 flex-col items-center gap-2.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex size-11 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-primary/15 text-primary shadow-xs ring-1 ring-primary/30"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
                aria-label={label}
              >
                {active && (
                  <span className="absolute left-[-8px] h-5 w-1 rounded-r-full bg-primary" />
                )}
                <Icon className="size-5 shrink-0" aria-hidden />

                {/* Floating tooltip on hover */}
                <span className="pointer-events-none absolute left-full ml-3 hidden rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md group-hover:flex whitespace-nowrap z-50">
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Rail Actions */}
        <div className="flex flex-col items-center gap-3 border-t border-sidebar-border/80 pt-4 w-full">
          <ThemeToggle id="theme-toggle-desktop" />

          <Link
            href="/profil"
            className="group relative flex size-10 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground border border-border transition-all hover:border-primary/50 hover:shadow-xs"
            aria-label={`Profil de ${name}`}
          >
            {initials || "?"}
            <span className="pointer-events-none absolute left-full ml-3 hidden rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md group-hover:flex whitespace-nowrap z-50">
              {name} • Profil
            </span>
          </Link>
        </div>
      </aside>

      {/* Main Page Area */}
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
