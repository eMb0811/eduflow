"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, ArrowRight, Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { DirectEmailAuth } from "@/components/auth/direct-email-auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const { login } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; form?: string }>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string; form?: string } = {};
    if (!email) {
      newErrors.email = "L'adresse email est requise";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Format d'adresse email invalide";
    }

    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const res = await login({ email, password });
      if (res.success) {
        let target = redirectUrl;
        if (res.user?.role === "superadmin" || res.user?.role === "admin") {
          target = "/admin";
        } else if (res.onboardingCompleted === false) {
          target = "/onboarding";
        }
        router.push(target);
        router.refresh();
      } else {
        setErrors({ form: res.error || "Adresse email ou mot de passe incorrect" });
      }
    } catch {
      setErrors({ form: "Une erreur inattendue est survenue" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-slate-200/80 bg-white/95 backdrop-blur-sm dark:bg-slate-900/95">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-sm">
          <img src="/logo.png" alt="EduFlow" className="h-full w-full object-cover" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bienvenue sur EduFlow
        </CardTitle>
        <CardDescription className="text-slate-500">
          Connectez-vous par code e-mail ou avec votre mot de passe
        </CardDescription>
      </CardHeader>

      <div className="px-6 pb-2">
        <DirectEmailAuth redirectUrl={redirectUrl} />
      </div>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-2">
          {errors.form && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{errors.form}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Adresse Email
            </label>
            <div className="relative">
              <Input
                id="login-email"
                name="email"
                type="email"
                placeholder="etudiant@universite.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                className="pl-10"
                autoComplete="email"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Mot de passe
              </label>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                className="pl-10"
                autoComplete="current-password"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full gap-2 py-5 font-semibold text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Connexion en cours...
              </>
            ) : (
              <>
                Se connecter <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Vous n&apos;avez pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-semibold text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-400"
            >
              Créer un compte
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
