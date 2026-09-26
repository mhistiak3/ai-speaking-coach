"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Accessible toggle switch with label + optional helper text. */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 py-2.5",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-soft">{description}</span>}
      </span>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6.5 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "btn-gradient" : "bg-black/15 dark:bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-5.5" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex w-full gap-1 rounded-2xl border border-edge bg-black/4 p-1 dark:bg-white/5"
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-xl font-semibold transition-all",
            size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
            value === opt.value
              ? "bg-[var(--surface-solid)] text-ink shadow-sm"
              : "text-ink-faint hover:text-ink-soft",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
