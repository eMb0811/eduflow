"use client"

import { useState, useEffect, useCallback } from "react"
import type { ApiResponse, PomodoroStatsResponse, PomodoroStats } from "@/types/api"
import type { PomodoroType } from "@/types/database"

const DEFAULT_STATS: PomodoroStats = {
  weekly_study_minutes: [75, 100, 50, 125, 75, 40, 0],
  total_study_minutes_today: 75,
  total_sessions_count: 12,
  current_streak_days: 4,
}

export function usePomodoroStats() {
  const [stats, setStats] = useState<PomodoroStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/pomodoro/stats")
      const json: ApiResponse<PomodoroStatsResponse> = await res.json()
      if (res.ok && json.success && json.data) {
        setStats(json.data.stats)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des statistiques")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    void (async () => {
      try {
        const res = await fetch("/api/pomodoro/stats")
        const json: ApiResponse<PomodoroStatsResponse> = await res.json()
        if (isMounted) {
          if (res.ok && json.success && json.data) {
            setStats(json.data.stats)
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erreur")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  }
}

export async function savePomodoroSession(payload: {
  duration_minutes: number
  type: PomodoroType
}) {
  try {
    const res = await fetch("/api/pomodoro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}
