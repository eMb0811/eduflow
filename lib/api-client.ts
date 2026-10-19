/**
 * Client API EduFlow
 * Fonctions de fetch centralisées pour communiquer avec le backend
 */

import type {
  ApiResponse,
  ApiError,
  ProfileResponse,
  UpdateProfileRequest,
  ParseScheduleResponse,
  GeneratePlanningRequest,
  GeneratePlanningResponse,
  SendChatMessageRequest,
  ChatStreamEvent,
  DocumentsResponse,
  SummarizeResponse,
  FlashcardsResponse,
  QuizResponse,
  SubmitQuizRequest,
  QuizResultResponse,
  StartPomodoroRequest,
  PomodoroResponse,
  StatsResponse,
  DashboardResponse,
} from "@/types/api";

const API_BASE = "/api";

/**
 * Fetch wrapper avec gestion d'erreur standardisée
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      success: false as const,
      message: `Erreur ${res.status}: ${res.statusText}`,
    }));
    throw new Error(error.message);
  }

  return res.json();
}

/**
 * Upload de fichier (multipart/form-data)
 */
async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error: ApiError = await res.json().catch(() => ({
      success: false as const,
      message: `Erreur upload ${res.status}`,
    }));
    throw new Error(error.message);
  }

  return res.json();
}

// ==============================
// Module 1 : Profil
// ==============================
export const profileApi = {
  get: () => apiFetch<ProfileResponse["data"]>("/profile"),

  update: (data: UpdateProfileRequest) =>
    apiFetch<ProfileResponse["data"]>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ==============================
// Module 2 : Emploi du Temps
// ==============================
export const scheduleApi = {
  parse: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<ParseScheduleResponse["data"]>("/schedule/parse", formData);
  },

  getEntries: () =>
    apiFetch<ParseScheduleResponse["data"]>("/schedule"),
};

// ==============================
// Module 3 : Planning
// ==============================
export const planningApi = {
  generate: (params: GeneratePlanningRequest) =>
    apiFetch<GeneratePlanningResponse["data"]>("/schedule/generate-planning", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getWeekly: (weekStart?: string) =>
    apiFetch<GeneratePlanningResponse["data"]>(
      `/schedule/planning${weekStart ? `?week=${weekStart}` : ""}`
    ),
};

// ==============================
// Module 4 : Chat IA (avec streaming)
// ==============================
export const chatApi = {
  send: async function* (
    data: SendChatMessageRequest
  ): AsyncGenerator<ChatStreamEvent> {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok || !res.body) {
      yield { type: "error", error: `Erreur ${res.status}` };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event: ChatStreamEvent = JSON.parse(line.slice(6));
            yield event;
          } catch {
            yield { type: "content", content: line.slice(6) };
          }
        }
      }
    }
  },

  getHistory: (conversationId?: string) =>
    apiFetch<ChatHistoryResponse["data"]>(
      `/ai/chat/history${conversationId ? `?conversation=${conversationId}` : ""}`
    ),
};

// ==============================
// Modules 5 & 6 : Documents
// ==============================
export const documentsApi = {
  list: () => apiFetch<DocumentsResponse["data"]>("/documents"),

  upload: (file: File, title: string, subjectId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    if (subjectId) formData.append("subject_id", subjectId);
    return apiUpload<DocumentsResponse["data"]>("/documents", formData);
  },

  summarize: (documentId: string) =>
    apiFetch<SummarizeResponse["data"]>("/documents/summarize", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId }),
    }),

  generateFlashcards: (documentId: string) =>
    apiFetch<FlashcardsResponse["data"]>("/documents/flashcards", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId }),
    }),

  generateQuiz: (documentId: string) =>
    apiFetch<QuizResponse["data"]>("/documents/quiz", {
      method: "POST",
      body: JSON.stringify({ document_id: documentId }),
    }),

  submitQuiz: (data: SubmitQuizRequest) =>
    apiFetch<QuizResultResponse>("/documents/quiz/submit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ==============================
// Modules 7 & 8 : Pomodoro & Stats
// ==============================
export const pomodoroApi = {
  start: (data: StartPomodoroRequest) =>
    apiFetch<PomodoroResponse["data"]>("/pomodoro", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  complete: (sessionId: string) =>
    apiFetch<PomodoroResponse["data"]>(`/pomodoro/${sessionId}/complete`, {
      method: "PUT",
    }),
};

export const statsApi = {
  get: () => apiFetch<StatsResponse["data"]>("/stats"),
};

// ==============================
// Dashboard
// ==============================
export const dashboardApi = {
  get: () => apiFetch<DashboardResponse["data"]>("/dashboard"),
};

// Import nécessaire pour le type
import type { ChatHistoryResponse } from "@/types/api";
