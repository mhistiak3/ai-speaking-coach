"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * True only after the first client render. Zustand + localStorage persisted
 * stores can differ from the server's default state — gate that content on
 * this to avoid hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}
