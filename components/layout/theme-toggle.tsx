"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { AnimatePresence, motion } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// True only on the client, after hydration — avoids SSR/theme mismatch.
const subscribe = () => () => {}
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

export function ThemeToggle({
  id = "theme-toggle",
  className,
}: {
  id?: string
  className?: string
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const isClient = useIsClient()
  const isDark = isClient && resolvedTheme === "dark"
  const label = isDark ? "Activer le thème clair" : "Activer le thème sombre"

  return (
    <Button
      id={id}
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      disabled={!isClient}
      className={cn("relative overflow-hidden rounded-xl", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ y: -14, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 14, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="grid place-items-center"
        >
          {isDark ? (
            <Moon className="size-[18px]" aria-hidden />
          ) : (
            <Sun className="size-[18px]" aria-hidden />
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}
