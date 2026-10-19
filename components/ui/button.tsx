import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-xs";

    const variantStyles = {
      default:
        "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:active:bg-white shadow-xs",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs",
      outline:
        "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900 dark:hover:border-slate-700 shadow-2xs",
      secondary:
        "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300/60 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700",
      ghost:
        "shadow-none hover:bg-slate-100/90 hover:text-slate-900 active:bg-slate-200/70 dark:hover:bg-slate-800/90 dark:text-slate-100 dark:active:bg-slate-700",
      link: "text-amber-700 dark:text-amber-400 underline-offset-4 hover:underline shadow-none",
    };

    const sizeStyles = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
