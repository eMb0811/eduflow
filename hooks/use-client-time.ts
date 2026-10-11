"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

export function useCurrentDate(): Date | null {
  return useSyncExternalStore(
    subscribe,
    () => new Date(),
    () => null
  )
}
