import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, createAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth/jwt';
import {
  OTP_COOKIE_NAME,
  generateOtpCode,
  createSignedOtp,
  verifySignedOtp,
  deriveDisplayNameFromEmail,
} from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/mail/mailer';
import { apiError, apiSuccess } from '@/lib/api/response';
import crypto from 'crypto';

/**
 * POST /api/auth/email-direct
 * Authentification directe sécurisée par e-mail (Code OTP à 6 chiffres) :
 * - mode: 'send-code'   -> Génère un code à 6 chiffres signé (HMAC-SHA256) et l'envoie par SMTP (avec secours local si SMTP absent)
 * - mode: 'verify-code' -> Vérifie le code à 6 chiffres, crée ou récupère l'utilisateur MySQL et ouvre la session JWT
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = body.mode as 'send-code' | 'verify-code';
    const rawEmail = (body.email || '').toLowerCase().trim();

    if (!rawEmail || !/\S+@\S+\.\S+/.test(rawEmail)) {
      return apiError('Veuillez saisir une adresse email valide', 400);
    }

    // 1. Mode : Envoi d'un code de connexion à 6 chiffres
    if (mode === 'send-code') {
      const code = generateOtpCode();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      const signedOtp = createSignedOtp(rawEmail, code, expiresAt);

      const mailResult = await sendOtpEmail(rawEmail, code);

      const response = apiSuccess({
        email: rawEmail,
        expires_in_seconds: 600,
        sent_via_smtp: mailResult.sentViaSmtp,
        // Secours uniquement lorsque aucun serveur SMTP n'est configuré en développement local
        ...(mailResult.sentViaSmtp ? {} : { dev_code: code }),
      });

      const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

      response.cookies.set({
        name: OTP_COOKIE_NAME,
        value: signedOtp,
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      });

      return response;
    }

    // 2. Mode : Vérification obligatoire du code à 6 chiffres
    if (mode === 'verify-code') {
      const code = (body.code || '').toString().trim();
      const signedCookie = request.cookies.get(OTP_COOKIE_NAME)?.value;

      if (!code || !/^\d{6}$/.test(code)) {
        return apiError('Le code de vérification doit comporter 6 chiffres', 400);
      }

      if (!signedCookie || !verifySignedOtp(signedCookie, rawEmail, code)) {
        return apiError('Code de vérification invalide ou expiré', 401);
      }
    } else {
      return apiError("Mode d'authentification non reconnu", 400);
    }

    // 3. Trouver ou créer l'utilisateur dans MySQL après validation stricte du code OTP
    let user = await prisma.user.findUnique({
      where: { email: rawEmail },
      include: { profile: true },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const randomPassHash = await hashPassword(
        crypto.randomBytes(24).toString('hex')
      );
      const displayName =
        (body.fullName || '').trim() || deriveDisplayNameFromEmail(rawEmail);

      user = await prisma.user.create({
        data: {
          email: rawEmail,
          passwordHash: randomPassHash,
          role: 'student',
          profile: {
            create: {
              email: rawEmail,
              fullName: displayName,
              onboardingCompleted: false,
            },
          },
        },
        include: { profile: true },
      });
    }

    const token = await createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const onboardingCompleted = Boolean(user.profile?.onboardingCompleted);

    const response = apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      profile: user.profile,
      isNewUser,
      onboardingCompleted,
    });

    // Supprimer le cookie OTP temporaire
    response.cookies.delete(OTP_COOKIE_NAME);

    const isHttps = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

    // Définir le cookie de session JWT HttpOnly
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return response;
  } catch (error) {
    console.error('Erreur POST /api/auth/email-direct :', error);
    return apiError(
      error instanceof Error ? error.message : 'Erreur interne lors de la connexion directe',
      500
    );
  }
}
