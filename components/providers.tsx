"use client"

import { useEffect, useState } from "react"
import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/sonner"
import { usePomodoroStore } from "@/lib/store/pomodoro-store"

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (never shared between SSR requests).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const status = (error as { status?: number }).status
              if (status && status >= 400 && status < 500) return false
              return failureCount < 2
            },
          },
        },
      })
  )

  // Persisted stores are rehydrated after mount to avoid SSR/localStorage mismatches.
  useEffect(() => {
    void usePomodoroStore.persist.rehydrate()
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-center" closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
