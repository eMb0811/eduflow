import * as React from "react"
import { cn } from "@/lib/utils"

interface EduFlowLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number
  showText?: boolean
  className?: string
}

export function EduFlowLogo({
  size = 32,
  showText = false,
  className,
  ...props
}: EduFlowLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
        aria-hidden={showText ? true : undefined}
        aria-label={showText ? undefined : "Logo EduFlow"}
        {...props}
      >
        <defs>
          {/* Main Neon Cyan to Electric Blue Gradient */}
          <linearGradient id="ef-flow-gradient" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="45%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          {/* Glowing Quill Feather Gradient */}
          <linearGradient id="ef-feather-grad" x1="14" y1="10" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="70%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Accent Flow Wave Gradient */}
          <linearGradient id="ef-wave-grad" x1="8" y1="28" x2="38" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
          </linearGradient>

          {/* Subtle Ambient Drop Glow */}
          <filter id="ef-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00F0FF" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Dynamic Learning Flow Wave Ribbon (Wrap at base) */}
        <path
          d="M 9 34 C 8 28 12 23 18 20 C 18.8 19.5 19.5 20.5 19 21.2 C 15 26 13 30 16 34 C 18.5 37.5 24 38 32 36.5 C 33.2 36.3 33.6 37.8 32.5 38.3 C 23 42 12 41 9 34 Z"
          fill="url(#ef-wave-grad)"
        />

        {/* Monogram 'E' Feather Spine (Quill Shaft) */}
        <path
          d="M 16 38 C 17 31 20 22 28 13 C 29 11.8 31 10.5 33 9.5 C 33.8 9.1 34.6 9.8 34.2 10.6 C 30 18 25 27 20 37 C 19.4 38.2 17.2 38.5 16 38 Z"
          fill="url(#ef-flow-gradient)"
        />

        {/* Top Arm of 'E' - Aerodynamic Quill Tip */}
        <path
          d="M 23 11 C 28 9.5 35 9 39 10 C 39.8 10.2 40.1 11.2 39.4 11.7 C 35 14.5 30 17 25 18 C 24 18.2 23.4 17.2 23.8 16.3 C 24.5 14.5 24.2 12.5 23 11 Z"
          fill="url(#ef-feather-grad)"
          filter="url(#ef-glow)"
        />

        {/* Middle Crossbar of 'E' - Forward Momentum Vane */}
        <path
          d="M 20 21 C 24 20.5 30 20 34 21 C 34.8 21.2 35.1 22.2 34.3 22.7 C 30 25.5 25 27.5 21 28 C 19.8 28.1 19.5 26.8 20.2 26 C 21 24.8 21 23 20 21 Z"
          fill="url(#ef-feather-grad)"
        />

        {/* Bottom Arm of 'E' - Grounded Horizon Vane */}
        <path
          d="M 18 31 C 23 30.5 28 30 33 30.8 C 34 31 34.2 32.2 33.3 32.7 C 28 35.5 22 36.8 17 36 C 16.2 35.8 16.5 34.5 17.3 34.2 C 18.5 33.8 18.8 32.2 18 31 Z"
          fill="url(#ef-feather-grad)"
        />

        {/* Floating AI Sparkle above Quill Tip */}
        <path
          d="M 40 6 C 40.2 7.5 41.5 8.8 43 9 C 41.5 9.2 40.2 10.5 40 12 C 39.8 10.5 38.5 9.2 37 9 C 38.5 8.8 39.8 7.5 40 6 Z"
          fill="#00F0FF"
        />
      </svg>

      {showText && (
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">
          Edu<span className="text-primary font-extrabold">Flow</span>
        </span>
      )}
    </div>
  )
}
