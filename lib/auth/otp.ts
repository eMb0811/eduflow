import crypto from 'crypto';

export const OTP_COOKIE_NAME = 'eduflow_email_otp';

function getOtpSecret(): string {
  return (
    process.env.JWT_SECRET ||
    'eduflow-secret-key-development-hackathon-2026-fallback'
  );
}

/**
 * Génère un code numérique aléatoire à 6 chiffres (cryptographiquement sûr)
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Crée un jeton OTP signé par HMAC-SHA256 contenant email, code et timestamp d'expiration
 */
export function createSignedOtp(
  email: string,
  code: string,
  expiresAt: number
): string {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.trim();
  const payload = `${normalizedEmail}:${cleanCode}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', getOtpSecret())
    .update(payload)
    .digest('hex');
  return `${payload}:${signature}`;
}

/**
 * Vérifie l'intégrité, la correspondance email/code et la validité temporelle du jeton OTP
 */
export function verifySignedOtp(
  signedValue: string,
  email: string,
  code: string
): boolean {
  const parts = signedValue.split(':');
  if (parts.length !== 4) return false;

  const [storedEmail, storedCode, expiresAtStr, signature] = parts;
  const expiresAt = Number(expiresAtStr);

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const cleanCode = code.trim();

  if (storedEmail !== normalizedEmail || storedCode !== cleanCode) {
    return false;
  }

  const expected = createSignedOtp(normalizedEmail, cleanCode, expiresAt);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signedValue, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * Déduit un nom d'affichage propre à partir de la partie locale d'une adresse e-mail
 */
export function deriveDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Étudiant';
  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}
