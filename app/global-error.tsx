"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Erreur globale racine interceptée :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen flex items-center justify-center bg-[#FAF8F5] p-4 font-sans text-slate-900">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Une interruption technique est survenue
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {error.message || "L'application EduFlow a rencontré une anomalie lors du chargement."}
          </p>
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Recharger l&apos;application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
