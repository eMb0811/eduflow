"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

/**
 * Barre de progression académique avec prise en charge du dark mode
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const numericValue = value || 0;
  const fillColor =
    numericValue >= 75
      ? "bg-emerald-600 dark:bg-emerald-400"
      : numericValue >= 50
      ? "bg-amber-500 dark:bg-amber-400"
      : "bg-slate-800 dark:bg-amber-500";

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ring-1 ring-inset ring-slate-300/60 dark:ring-slate-700/60",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-300 ease-in-out",
          fillColor
        )}
        style={{ transform: `translateX(-${100 - numericValue}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
