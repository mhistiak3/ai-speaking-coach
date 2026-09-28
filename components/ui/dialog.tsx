"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "md" | "lg" | "full";
}

/** Accessible modal: ESC to close, backdrop click, focus management. */
export function Dialog({ open, onClose, title, children, className, size = "md" }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "surface-solid animate-scale-in max-h-[92dvh] w-full overflow-y-auto rounded-t-4xl border border-edge shadow-xl outline-none sm:rounded-4xl",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          size === "full" && "sm:max-w-4xl",
          "bg-[var(--surface-solid)]",
          className,
        )}
      >
        {title != null && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-[var(--surface-solid)]/90 px-6 py-4 backdrop-blur">
            <h2 className="text-base font-bold text-ink">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-full p-2 text-ink-soft transition-colors hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
