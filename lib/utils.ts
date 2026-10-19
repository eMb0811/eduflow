/**
 * Utilitaires CSS pour la fusion de classes Tailwind
 * Combinaison de clsx et tailwind-merge
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formater une durée en minutes en texte lisible
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h${remainingMinutes.toString().padStart(2, "0")}`;
}

/**
 * Formater une heure "HH:MM" en format lisible
 */
export function formatTime(time: string): string {
  return time;
}

/**
 * Obtenir les couleurs d'un bloc de planning par type
 */
export function getBlockColors(type: "revision" | "pause" | "exam_prep") {
  const colors = {
    revision: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      border: "border-blue-300 dark:border-blue-700",
      text: "text-blue-800 dark:text-blue-200",
    },
    pause: {
      bg: "bg-green-100 dark:bg-green-900/30",
      border: "border-green-300 dark:border-green-700",
      text: "text-green-800 dark:text-green-200",
    },
    exam_prep: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      border: "border-orange-300 dark:border-orange-700",
      text: "text-orange-800 dark:text-orange-200",
    },
  };
  return colors[type];
}

/**
 * Jours de la semaine en français
 */
export const DAYS_OF_WEEK = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
] as const;

/**
 * Niveaux académiques avec labels
 */
export const ACADEMIC_LEVELS = [
  { value: "lycee", label: "Lycée" },
  { value: "licence_1", label: "Licence 1" },
  { value: "licence_2", label: "Licence 2" },
  { value: "licence_3", label: "Licence 3" },
  { value: "master_1", label: "Master 1" },
  { value: "master_2", label: "Master 2" },
  { value: "doctorat", label: "Doctorat" },
  { value: "formation_pro", label: "Formation Professionnelle" },
] as const;

/**
 * Créneaux horaires pour le planning (de 7h à 22h)
 */
export const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 7;
  return `${hour.toString().padStart(2, "0")}:00`;
});
