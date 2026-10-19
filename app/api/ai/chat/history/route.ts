import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { apiSuccess, apiError } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/chat/history
 * Renvoie les messages pour une conversation spécifique ou la dernière active depuis MySQL
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return apiError(authError || 'Non autorisé', 401);
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation') || searchParams.get('conversation_id');

    let resolvedSessionId = conversationId;

    if (!resolvedSessionId) {
      const latestSession = await prisma.chatSession.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      if (latestSession) {
        resolvedSessionId = latestSession.id;
      }
    }

    if (!resolvedSessionId) {
      return apiSuccess([]);
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId: resolvedSessionId,
        userId: user.id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return apiSuccess(
      messages.map((m) => ({
        id: m.id,
        session_id: m.sessionId,
        user_id: m.userId,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        metadata: m.metadata ? JSON.parse(m.metadata) : {},
        created_at: m.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Erreur GET /api/ai/chat/history :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne du serveur',
      500
    );
  }
}
