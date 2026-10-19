import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Health check endpoint verifying MySQL Prisma connectivity and environment variables
 */
export async function GET() {
  let dbHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch (err) {
    console.error('Erreur health check MySQL :', err);
    dbHealthy = false;
  }

  const geminiConfigured = !!process.env.GEMINI_API_KEY;
  const isHealthy = dbHealthy;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      services: {
        database_mysql: dbHealthy ? 'connected' : 'disconnected',
        gemini_ai: geminiConfigured ? 'configured' : 'optional_missing_key',
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
