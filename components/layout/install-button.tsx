"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

/** Captures PWA install prompt (Chromium) and renders an install chip. */
export function InstallButton() {
  const [deferred, setDeferred] = useState<Event | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        const prompt = deferred as Event & {
          prompt?: () => void;
          userChoice?: Promise<unknown>;
        };
        prompt.prompt?.();
        setDeferred(null);
        await prompt.userChoice?.catch(() => {});
      }}
      className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
    >
      <Download className="size-3.5" />
      Install
    </button>
  );
}
