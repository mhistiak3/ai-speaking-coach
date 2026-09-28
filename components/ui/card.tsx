import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("glass rounded-3xl", className)}
      {...props}
    />
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint", className)}>
      {children}
    </p>
  );
}
