"use client";

import { useEffect, type ReactNode } from "react";

import { useSettingsStore } from "@/lib/store/settings-store";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Client-side root providers:
 *  - keeps the <html> class in sync with the persisted theme
 *  - registers the service worker (PWA) in production
 */
export function Providers({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* PWA is a progressive enhancement */
    });
  }, []);

  return <ToastProvider>{children}</ToastProvider>;
}
