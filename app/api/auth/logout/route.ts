import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/jwt';
import { apiSuccess } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  const response = apiSuccess({ message: 'Déconnexion réussie' });

  const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

  // Suppression du cookie de session
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
