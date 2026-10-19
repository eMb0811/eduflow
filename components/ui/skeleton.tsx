import { cn } from "@/lib/utils";

/**
 * Composant squelette animé pour représenter des états de chargement
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-900/10 dark:bg-neutral-50/10",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
