"use client";

import * as React from "react";

interface TimerCircleProps {
  percentage: number; // 0 à 100
  timeString: string; // "25:00"
  mode: "work" | "shortBreak" | "longBreak";
}

export function TimerCircle({ percentage, timeString, mode }: TimerCircleProps) {
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const modeColors = {
    work: {
      stroke: "#d97706", // Ambre académique travail focus
      glow: "drop-shadow(0 0 10px rgba(217, 119, 6, 0.35))",
      label: "Concentration",
      badgeClass: "bg-amber-500/10 text-amber-700 border border-amber-500/25 dark:bg-amber-950/60 dark:text-amber-300",
    },
    shortBreak: {
      stroke: "#10b981", // Emerald pause courte
      glow: "drop-shadow(0 0 10px rgba(16, 185, 129, 0.35))",
      label: "Pause Courte",
      badgeClass: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 dark:bg-emerald-950/60 dark:text-emerald-300",
    },
    longBreak: {
      stroke: "#0ea5e9", // Sky pause longue
      glow: "drop-shadow(0 0 10px rgba(14, 165, 233, 0.35))",
      label: "Grande Pause",
      badgeClass: "bg-sky-500/10 text-sky-700 border border-sky-500/25 dark:bg-sky-950/60 dark:text-sky-300",
    },
  };

  const currentConfig = modeColors[mode];

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        className="transform -rotate-90 w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 xl:w-64 xl:h-64"
        viewBox="0 0 300 300"
      >
        {/* Cercle d'arrière-plan */}
        <circle
          cx="150"
          cy="150"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-100 dark:text-slate-800"
          fill="transparent"
        />

        {/* Cercle animé de progression */}
        <circle
          cx="150"
          cy="150"
          r={radius}
          stroke={currentConfig.stroke}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            filter: currentConfig.glow,
            transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.4s ease",
          }}
        />
      </svg>

      {/* Affichage du temps & du mode au centre du cercle */}
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
        <span
          className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-md mb-1 sm:mb-1.5 ${currentConfig.badgeClass}`}
        >
          {currentConfig.label}
        </span>
        <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
          {timeString}
        </span>
      </div>
    </div>
  );
}
