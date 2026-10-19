import * as React from "react";
import { cn } from "@/lib/utils";

export interface KoccIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Emblème vectoriel exclusif de Kocc (Tuteur Académique EduFlow)
 * Inspiré de Kocc Barma Fall (1586–1655) :
 * - À la base : le livre ouvert du savoir (« Xam-xam »).
 * - Au centre : la figure du sage et penseur.
 * - Au sommet : les 4 touffes symboliques (« Ñeenti Jub ») reliées comme une constellation de connaissance.
 */
export function KoccIcon({ className, ...props }: KoccIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Les 4 touffes de sagesse de Kocc Barma (Ñeenti Jub) & connexions de l'esprit */}
      <path d="M8.8 9.8L6.3 7.3" />
      <circle cx="5.2" cy="6.2" r="1.25" fill="currentColor" stroke="none" />

      <path d="M10.6 8.7L9.5 5.1" />
      <circle cx="9.1" cy="3.7" r="1.25" fill="currentColor" stroke="none" />

      <path d="M13.4 8.7L14.5 5.1" />
      <circle cx="14.9" cy="3.7" r="1.25" fill="currentColor" stroke="none" />

      <path d="M15.2 9.8L17.7 7.3" />
      <circle cx="18.8" cy="6.2" r="1.25" fill="currentColor" stroke="none" />

      {/* Visage / Médaillon central du Sage */}
      <circle cx="12" cy="11.8" r="3.3" />

      {/* Épaules / Assise de réflexion */}
      <path d="M7.8 17.2C8.8 15.7 10.3 15 12 15C13.7 15 15.2 15.7 16.2 17.2" />

      {/* Livre ouvert du savoir (Xam-xam) à la base */}
      <path d="M3 18.6C5.8 17.1 8.8 17.7 12 19.8C15.2 17.7 18.2 17.1 21 18.6" />
      <path d="M12 19.8V21.5" />
    </svg>
  );
}
