"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Composant de présence en arrière-plan
 * Émet un signal de vie ("heartbeat") toutes les 25 secondes
 * permettant au Super Utilisateur de visualiser en temps réel les utilisateurs connectés.
 */
export function PresenceTracker() {
  const { isAuthenticated, user } = useAuth();
  const pathname = usePathname();
  const lastPingRef = React.useRef<number>(0);

  const sendHeartbeat = React.useCallback(async (path: string) => {
    // Évite de spammer si plusieurs événements rapprochés ont lieu (< 8 secondes)
    const now = Date.now();
    if (now - lastPingRef.current < 8000) {
      return;
    }
    lastPingRef.current = now;

    try {
      await fetch("/api/user/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
        // keepalive permet de finaliser la requête même si l'onglet est en cours de fermeture
        keepalive: true,
      });
    } catch {
      // Échec silencieux
    }
  }, []);

  // 1. Émission périodique toutes les 25 secondes
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Premier ping immédiat
    sendHeartbeat(pathname);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        sendHeartbeat(pathname);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, pathname, sendHeartbeat]);

  // 2. Émission lors du retour sur l'onglet ou du focus
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat(pathname);
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [isAuthenticated, user, pathname, sendHeartbeat]);

  return null;
}
