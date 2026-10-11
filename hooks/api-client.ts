import type { ApiResponse } from "@/types/api"

/** Error thrown by apiFetch, carrying the HTTP status and backend details. */
export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: "Ta session a expiré. Connecte-toi pour continuer.",
  403: "Tu n'as pas accès à cette ressource.",
  404: "Ressource introuvable.",
  413: "Fichier trop volumineux.",
  429: "Trop de requêtes, réessaie dans un instant.",
}

/**
 * Calls an internal `/api/...` route and unwraps the `ApiResponse<T>` envelope.
 * Throws an `ApiError` with a French, user-facing message on failure.
 */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(input, {
      ...init,
      headers:
        init?.body instanceof FormData
          ? init?.headers
          : { "Content-Type": "application/json", ...init?.headers },
    })
  } catch {
    throw new ApiError("Impossible de joindre le serveur. Vérifie ta connexion.", 0)
  }

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await res.json()) as ApiResponse<T>
  } catch {
    payload = null
  }

  if (!res.ok || !payload?.success) {
    const message =
      STATUS_MESSAGES[res.status] ?? payload?.error ?? `Erreur inattendue (${res.status}).`
    throw new ApiError(message, res.status, payload?.details)
  }

  return payload.data as T
}

/** Simulates network latency for mocked endpoints. */
export function mockDelay<T>(data: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}
