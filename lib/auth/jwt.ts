import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

export const AUTH_COOKIE_NAME = 'eduflow_session';

const JWT_SECRET = process.env.JWT_SECRET || 'eduflow-secret-key-development-hackathon-2026-fallback';
const key = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Hache un mot de passe avec bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare un mot de passe en clair avec son hachage
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Génère un JWT signé pour l'utilisateur
 */
export async function createAuthToken(payload: TokenPayload, expiresIn: string = '7d'): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

/**
 * Vérifie et décode un JWT
 */
export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: (payload.role as string) || 'student',
    };
  } catch {
    return null;
  }
}
