"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Erreur d'exécution React interceptée :", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-slate-950 p-4 font-sans">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-lg space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Difficulté temporaire d&apos;affichage
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {error.message ||
            "Une exception imprévue est survenue lors de l'affichage de cette page. Vous pouvez recharger la vue."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </Button>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2 border-slate-300 dark:border-slate-700 cursor-pointer"
            >
              <Home className="h-4 w-4" />
              Tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
