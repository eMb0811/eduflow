"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  Timer,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useProfile } from "@/hooks/use-profile"

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
      className="flex items-center gap-2.5 rounded-lg px-2 py-1"
      aria-label="EduFlow, retour au tableau de bord"
    >
      <span className="bg-brand-gradient grid size-9 place-items-center rounded-xl text-white shadow-lg shadow-primary/30">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span className="font-heading text-xl font-semibold tracking-tight">
        Edu<span className="text-gradient">Flow</span>
      </span>
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
      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sidebar-accent"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
        {initials || "?"}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {profile?.field_of_study ?? "Compléter mon profil"}
        </span>
      </span>
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative flex min-h-dvh w-full">
      {/* Ambient background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="animate-float absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="animate-float absolute top-1/3 -right-32 size-[26rem] rounded-full bg-brand-2/15 blur-3xl [animation-delay:-3s]" />
        <div className="animate-float absolute -bottom-40 left-1/3 size-[24rem] rounded-full bg-chart-4/10 blur-3xl [animation-delay:-5s]" />
      </div>

      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 backdrop-blur-xl md:flex">
        <Logo />
        <nav aria-label="Navigation principale" className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border pt-4">
          <div className="min-w-0 flex-1">
            <UserChip />
          </div>
          <ThemeToggle id="theme-toggle-desktop" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl md:hidden">
          <Logo />
          <ThemeToggle id="theme-toggle-mobile" />
        </header>

        <main id="contenu" className="flex-1 px-4 pt-6 pb-28 sm:px-6 md:px-10 md:pt-10 md:pb-12">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
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
