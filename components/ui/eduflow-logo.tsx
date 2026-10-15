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
    <div className={cn("inline-flex items-center gap-2.5", className)}>
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
          {/* Main gradient for the fluid 'E' monogram */}
          <linearGradient id="eduflow-e-gradient" x1="16" y1="12" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="45%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          {/* Node circuit gradient */}
          <linearGradient id="eduflow-node-gradient" x1="6" y1="18" x2="20" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          {/* AI spark gradient */}
          <linearGradient id="eduflow-spark-gradient" x1="36" y1="6" x2="42" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          <filter id="eduflow-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38BDF8" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Neural Network Branches & Terminal Nodes */}
        {/* Upper branch */}
        <line x1="11" y1="18" x2="19" y2="24" stroke="url(#eduflow-node-gradient)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="11" cy="18" r="2.4" fill="#0B0F17" stroke="#38BDF8" strokeWidth="2" />

        {/* Lower branch */}
        <line x1="11" y1="30" x2="19" y2="24" stroke="url(#eduflow-node-gradient)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="11" cy="30" r="2.4" fill="#0B0F17" stroke="#10B981" strokeWidth="2" />

        {/* Central Interconnect Hub Node */}
        <circle cx="19" cy="24" r="3.2" fill="#0B0F17" stroke="#38BDF8" strokeWidth="2.2" />

        {/* Fluid Monogram 'E' */}
        {/* Top arm with aerodynamic curvature */}
        <path
          d="M 19 16 C 22 13 28 13 34 13.5 C 34.8 13.6 35.2 14.6 34.5 15.2 C 32 17 28 19 22 19 L 20 19"
          fill="url(#eduflow-e-gradient)"
        />
        {/* Backbone arc of 'E' flowing downwards */}
        <path
          d="M 21 16 C 17 20 17 28 21 32 C 24 35 28 35.5 34 35.5 C 34.8 35.5 35.2 34.4 34.4 33.9 C 31 31.8 27 30 23 29 C 21 28 20 26 21 24"
          fill="url(#eduflow-e-gradient)"
        />
        {/* Center crossbar with forward flow */}
        <path
          d="M 19 23 L 30 23 C 31.2 23 31.8 24.5 30.8 25.2 C 28 26.8 24 27 19 25 Z"
          fill="url(#eduflow-e-gradient)"
        />

        {/* AI Spark Star at Top Right */}
        <path
          d="M 38 7 C 38.3 9.2 39.8 10.7 42 11 C 39.8 11.3 38.3 12.8 38 15 C 37.7 12.8 36.2 11.3 34 11 C 36.2 10.7 37.7 9.2 38 7 Z"
          fill="url(#eduflow-spark-gradient)"
          filter="url(#eduflow-glow)"
        />
        {/* Micro spark dot */}
        <circle cx="34.5" cy="14.5" r="0.8" fill="#67E8F9" />
      </svg>

      {showText && (
        <span className="font-heading text-lg font-bold tracking-tight text-foreground">
          Edu<span className="text-primary font-extrabold">Flow</span>
        </span>
      )}
    </div>
  )
}
