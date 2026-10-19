import nodemailer from 'nodemailer';

export interface SendOtpEmailResult {
  sentViaSmtp: boolean;
  error?: string;
}

/**
 * Vérifie si un serveur SMTP réel est configuré dans les variables d'environnement
 */
export function isSmtpConfigured(): boolean {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();

  if (!host || !user || !pass) return false;
  if (
    host.includes('votre-') ||
    user.includes('votre-') ||
    pass.includes('votre-')
  ) {
    return false;
  }
  return true;
}

/**
 * Envoie le code de vérification à 6 chiffres par e-mail via SMTP (Nodemailer).
 * En l'absence de configuration SMTP valide, journalise le code dans la console serveur
 * et retourne `sentViaSmtp: false` pour activer le mode de secours local.
 */
export async function sendOtpEmail(
  recipientEmail: string,
  code: string
): Promise<SendOtpEmailResult> {
  if (!isSmtpConfigured()) {
    console.info(
      `[EduFlow Mailer - Mode Local] Code de connexion pour ${recipientEmail} : ${code}`
    );
    return { sentViaSmtp: false };
  }

  try {
    const port = Number(process.env.SMTP_PORT || '587');
    const secure = port === 465 || process.env.SMTP_SECURE === 'true';
    const fromAddress =
      process.env.SMTP_FROM ||
      `"EduFlow Académique" <${process.env.SMTP_USER}>`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: `${code} est votre code de connexion EduFlow`,
      text: `Bonjour,\n\nVotre code de vérification à usage unique pour accéder à votre espace EduFlow est : ${code}\n\nCe code est valable pendant 10 minutes.\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
          <div style="margin-bottom: 16px;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: #0f172a; color: #fbbf24; font-size: 12px; font-weight: 700; letter-spacing: 0.04em;">
              EDUFLOW ACADÉMIQUE
            </span>
          </div>
          <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
            Votre code de connexion directe
          </h2>
          <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #475569;">
            Saisissez ce code à 6 chiffres dans votre navigateur pour accéder immédiatement à votre espace de travail :
          </p>
          <div style="text-align: center; padding: 18px; border-radius: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; margin-bottom: 20px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #0f172a;">
              ${code}
            </span>
          </div>
          <p style="margin: 0; font-size: 12px; color: #64748b;">
            Ce code expire automatiquement dans 10 minutes.
          </p>
        </div>
      `,
    });

    return { sentViaSmtp: true };
  } catch (err) {
    console.warn(
      '[EduFlow Mailer] Échec envoi SMTP, bascule sur affichage de secours :',
      err instanceof Error ? err.message : err
    );
    return {
      sentViaSmtp: false,
      error: err instanceof Error ? err.message : 'Erreur SMTP',
    };
  }
}
