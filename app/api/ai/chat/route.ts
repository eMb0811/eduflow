import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser, isSupabaseConfigured } from "@/lib/supabase/server"
import { getDevStore } from "@/lib/supabase/dev-store"
import { createChatCompletionStream } from "@/lib/gemini/chat"
import type { ApiResponse } from "@/types/api"
import type { ChatMessage, Profile } from "@/types/database"

const chatPayloadSchema = z.object({
  message: z.string().trim().min(1, "Le message ne peut pas être vide").max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .optional(),
})

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Format JSON invalide" },
        { status: 400 }
      )
    }

    const parsed = chatPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: "Validation échouée",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { message, history = [] } = parsed.data

    // 1. Récupération du profil
    let profile: Profile | null = null
    if (isSupabaseConfigured() && supabase) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()
      profile = data
    } else {
      profile = getDevStore().profile
    }

    // 2. Enregistrement immédiat du message de l'utilisateur
    if (isSupabaseConfigured() && supabase) {
      void supabase.from("chat_messages").insert({
        user_id: user.id,
        role: "user",
        content: message,
      })
    } else {
      getDevStore().chatMessages.push({
        id: crypto.randomUUID(),
        user_id: user.id,
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      })
    }

    // 3. Préparation des messages pour Gemini
    const conversationMessages = [...history, { role: "user" as const, content: message }]

    let geminiStream: AsyncIterable<{ text?: string }>
    try {
      geminiStream = await createChatCompletionStream(conversationMessages, profile)
    } catch (aiErr: unknown) {
      const errMsg =
        aiErr instanceof Error ? aiErr.message : "Erreur du modèle IA lors de l'initialisation"
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: errMsg },
        { status: 502 }
      )
    }

    // 4. Flux de streaming vers le client
    const encoder = new TextEncoder()
    let fullAssistantResponse = ""

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of geminiStream) {
            const text = chunk.text || ""
            if (text) {
              fullAssistantResponse += text
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()

          // Sauvegarde de la réponse complète de l'assistant à la fin du flux
          if (fullAssistantResponse.trim()) {
            if (isSupabaseConfigured() && supabase) {
              await supabase.from("chat_messages").insert({
                user_id: user.id,
                role: "assistant",
                content: fullAssistantResponse,
              })
            } else {
              getDevStore().chatMessages.push({
                id: crypto.randomUUID(),
                user_id: user.id,
                role: "assistant",
                content: fullAssistantResponse,
                created_at: new Date().toISOString(),
              })
            }
          }
        } catch (streamErr) {
          controller.error(streamErr)
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform",
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur"
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse<ApiResponse<ChatMessage[]>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (error) {
        return NextResponse.json<ApiResponse<ChatMessage[]>>(
          { success: false, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json<ApiResponse<ChatMessage[]>>(
        { success: true, data: data || [] },
        { status: 200 }
      )
    }

    const devMessages = getDevStore().chatMessages
    return NextResponse.json<ApiResponse<ChatMessage[]>>(
      { success: true, data: devMessages },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur"
    return NextResponse.json<ApiResponse<ChatMessage[]>>(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function DELETE(): Promise<NextResponse<ApiResponse<{ cleared: boolean }>>> {
  try {
    const auth = await requireUser()
    if (auth.error) {
      return auth.error
    }

    const { user, supabase } = auth

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", user.id)

      if (error) {
        return NextResponse.json<ApiResponse<{ cleared: boolean }>>(
          { success: false, error: error.message },
          { status: 500 }
        )
      }
    } else {
      getDevStore().chatMessages = []
    }

    return NextResponse.json<ApiResponse<{ cleared: boolean }>>(
      { success: true, data: { cleared: true } },
      { status: 200 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne du serveur"
    return NextResponse.json<ApiResponse<{ cleared: boolean }>>(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
