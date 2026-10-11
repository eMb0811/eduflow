"use client"

import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()
let clientDate: Date | null = null
let intervalId: ReturnType<typeof setInterval> | null = null

function subscribe(callback: () => void) {
  listeners.add(callback)

  if (typeof window !== "undefined") {
    if (!clientDate) {
      clientDate = new Date()
    }
    if (!intervalId) {
      intervalId = setInterval(() => {
        clientDate = new Date()
        listeners.forEach((cb) => cb())
      }, 60_000)
    }
  }

  return () => {
    listeners.delete(callback)
    if (listeners.size === 0 && intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

function getClientDateSnapshot(): Date | null {
  if (!clientDate && typeof window !== "undefined") {
    clientDate = new Date()
  }
  return clientDate
}

function getServerDateSnapshot(): null {
  return null
}

export function useCurrentDate(): Date | null {
  return useSyncExternalStore(
    subscribe,
    getClientDateSnapshot,
    getServerDateSnapshot
  )
}

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
