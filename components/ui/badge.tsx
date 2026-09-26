import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "brand" | "good" | "warn" | "bad" | "neutral";

const tones: Record<Tone, string> = {
  brand: "bg-brand/12 text-brand border-brand/25",
  good: "bg-good/12 text-good border-good/25",
  warn: "bg-warn/12 text-warn border-warn/30",
  bad: "bg-bad/12 text-bad border-bad/25",
  neutral: "bg-black/5 text-ink-soft border-edge-strong dark:bg-white/8",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
