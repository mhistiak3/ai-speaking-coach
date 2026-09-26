"use client";

import { cn } from "@/lib/utils";
import { useEffect, useLayoutEffect, useRef } from "react";

interface WaveformProps {
  /** Live 0–1 mic level, or undefined for idle breathing animation. */
  level?: number;
  active: boolean;
  bars?: number;
  className?: string;
  colorClass?: string;
}

/**
 * Lightweight speaking indicator. Uses transform-only animation so it stays
 * smooth on mobile (GSAP-style 60fps discipline without the dependency).
 */
export function Waveform({ level, active, bars = 24, className, colorClass }: WaveformProps) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const levelRef = useRef<number | undefined>(level);
  useLayoutEffect(() => {
    levelRef.current = level;
  });

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const seeds = Array.from({ length: bars }, (_, i) => 0.4 + 0.6 * Math.abs(Math.sin(i * 2.4)));
    const current = new Array<number>(bars).fill(0.15);
    let t = 0;
    const tick = () => {
      t += 0.12;
      for (let i = 0; i < bars; i++) {
        const base = levelRef.current ?? 0.35;
        const live = levelRef.current != null;
        const wave = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 0.55 + seeds[i]! * 4);
        const target = Math.min(1, 0.12 + base * wave * (live ? 1.6 : 0.9));
        current[i] = current[i]! + (target - current[i]!) * 0.25;
        const el = refs.current[i];
        if (el) el.style.transform = `scaleY(${0.12 + current[i]! * 0.88})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, bars]);

  return (
    <div
      aria-hidden
      className={cn("flex h-10 items-center justify-center gap-[3px]", className)}
    >
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={cn(
            "w-[3px] origin-center rounded-full transition-opacity",
            colorClass ?? "bg-brand-2",
            active ? "opacity-90" : "opacity-30",
          )}
          style={{ height: "100%", transform: active ? undefined : "scaleY(0.12)" }}
        />
      ))}
    </div>
  );
}
