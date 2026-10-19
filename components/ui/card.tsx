import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white text-slate-900 ring-1 ring-inset ring-slate-900/[0.03] shadow-[0_2px_10px_-3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-slate-300/90 hover:ring-amber-500/20 hover:shadow-[0_10px_28px_-8px_rgba(15,23,42,0.08)] dark:border-slate-800/90 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-white/[0.04] dark:hover:border-slate-700/90 dark:hover:ring-amber-400/20 dark:hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.45)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-500 dark:text-slate-400", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-5 pt-0", className)} {...props} />;
}
