"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
  KeyRound,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";

interface DirectEmailAuthProps {
  redirectUrl?: string;
}

export function DirectEmailAuth({
  redirectUrl = "/dashboard",
}: DirectEmailAuthProps) {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [showOtpBox, setShowOtpBox] = React.useState(false);
  const [magicEmail, setMagicEmail] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [sentViaSmtp, setSentViaSmtp] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [devCodeHint, setDevCodeHint] = React.useState<string | null>(null);
  const [isOtpLoading, setIsOtpLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const handleSendOtpCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = magicEmail.trim().toLowerCase();
    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setAuthError("Veuillez saisir une adresse email valide.");
      return;
    }

    setIsOtpLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/email-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "send-code",
          email: cleanEmail,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setAuthError(json.message || "Impossible d'envoyer le code");
        return;
      }

      setOtpSent(true);
      setOtpCode("");
      setSentViaSmtp(Boolean(json.data?.sent_via_smtp));
      setDevCodeHint(json.data?.dev_code || null);
    } catch {
      setAuthError("Erreur réseau lors de l'envoi du code");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyOtpCode = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify ?? otpCode).trim();
    if (!/^\d{6}$/.test(finalCode)) {
      setAuthError("Veuillez saisir le code à 6 chiffres.");
      return;
    }

    setIsOtpLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/email-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "verify-code",
          email: magicEmail.trim().toLowerCase(),
          code: finalCode,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setAuthError(json.message || "Code invalide ou expiré");
        return;
      }

      await refreshProfile();
      const userRole = json.data?.user?.role;
      let target = redirectUrl;
      if (userRole === "superadmin" || userRole === "admin") {
        target = "/admin";
      } else if (json.data?.onboardingCompleted === false) {
        target = "/onboarding";
      }
      router.push(target);
      router.refresh();
    } catch {
      setAuthError("Erreur réseau lors de la vérification du code");
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {authError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {authError}
        </div>
      )}

      {!showOtpBox ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAuthError(null);
            setShowOtpBox(true);
          }}
          className="w-full h-11 gap-2.5 font-semibold text-sm bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs"
        >
          <KeyRound className="h-4 w-4 text-amber-500" />
          Continuer par Email (Code à 6 chiffres)
        </Button>
      ) : (
        <div className="p-3.5 rounded-xl border border-amber-500/35 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-amber-500" />
              Authentification par code Email
            </span>
            <button
              type="button"
              onClick={() => {
                setShowOtpBox(false);
                setOtpSent(false);
                setOtpCode("");
                setDevCodeHint(null);
                setAuthError(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Fermer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtpCode} className="flex gap-2">
              <Input
                id="otp-email-input"
                name="otp-email-input"
                type="email"
                placeholder="etudiant@universite.edu"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                className="h-9 text-xs bg-white dark:bg-slate-900"
                autoComplete="email"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={isOtpLoading}
                className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs shrink-0 gap-1"
              >
                {isOtpLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Recevoir le code <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-2.5">
              {sentViaSmtp ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Code envoyé par e-mail à <strong>{magicEmail}</strong>
                  </span>
                </div>
              ) : (
                devCodeHint && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      Code local (sans SMTP) :{" "}
                      <strong className="font-mono tracking-wider">
                        {devCodeHint}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpCode(devCodeHint);
                        handleVerifyOtpCode(devCodeHint);
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-semibold text-[11px] hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    >
                      Valider
                    </button>
                  </div>
                )
              )}

              <div className="flex gap-2">
                <Input
                  id="otp-code-input"
                  name="otp-code-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Code à 6 chiffres"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="h-9 text-center font-mono tracking-widest text-sm bg-white dark:bg-slate-900"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isOtpLoading || otpCode.length !== 6}
                  onClick={() => handleVerifyOtpCode()}
                  className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs shrink-0"
                >
                  {isOtpLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Vérifier"
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode("");
                    setDevCodeHint(null);
                  }}
                  className="hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Changer d&apos;adresse
                </button>
                <button
                  type="button"
                  disabled={isOtpLoading}
                  onClick={() => handleSendOtpCode()}
                  className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <RotateCcw className="h-3 w-3" /> Renvoyer un code
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Séparateur académique */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-white dark:bg-slate-900 px-2.5 text-slate-400 font-medium">
            ou avec mot de passe
          </span>
        </div>
      </div>
    </div>
  );
}
