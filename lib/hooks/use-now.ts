"use client";

import { useEffect, useState } from "react";

/**
 * A ticking "now" timestamp (ms) so components can render elapsed time
 * without calling Date.now() during render (impure under React Compiler).
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
