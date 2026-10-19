"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Redirection transparente de l'ancienne page /pomodoro vers l'Agenda & Révisions unifié (/planning)
 */
export default function PomodoroPageRedirect() {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const subject = params.get("subject");
      if (subject) {
        router.replace(`/planning?focus=${encodeURIComponent(subject)}`);
      } else {
        router.replace("/planning");
      }
    }
  }, [router]);

  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      <p className="text-xs text-slate-500">Ouverture de votre session Focus dans l&apos;Agenda...</p>
    </div>
  );
}
