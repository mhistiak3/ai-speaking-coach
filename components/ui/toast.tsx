"use client";

import { create } from "zustand";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const useToastStore = create<{ toasts: Toast[]; push: (t: Toast) => void; remove: (id: number) => void }>(
  (set) => ({
    toasts: [],
    push: (t) => set((s) => ({ toasts: [...s.toasts.slice(-3), t] })),
    remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  }),
);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [exiting, setExiting] = useState<number[]>([]);
  const toasts = useToastStore((s) => s.toasts);
  const push = useToastStore((s) => s.push);
  const remove = useToastStore((s) => s.remove);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback(
    (id: number) => {
      setExiting((e) => [...e, id]);
      const t = timers.current.get(id);
      if (t) clearTimeout(t);
      setTimeout(() => {
        remove(id);
        setExiting((e) => e.filter((x) => x !== id));
      }, 180);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => fire("success", message),
      error: (message) => fire("error", message),
      info: (message) => fire("info", message),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function fire(kind: ToastKind, message: string) {
    const id = nextId++;
    push({ id, kind, message });
    timers.current.set(id, setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500));
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 sm:top-5"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={cn(
              "glass pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 text-left text-sm shadow-xl shadow-black/10 transition-all",
              exiting.includes(t.id) ? "translate-y-[-6px] scale-95 opacity-0" : "animate-fade-up",
            )}
          >
            {t.kind === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />}
            {t.kind === "error" && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-bad" />}
            {t.kind === "info" && <Info className="mt-0.5 size-4 shrink-0 text-brand-2" />}
            <span className="text-ink">{t.message}</span>
            <X className="ml-auto mt-0.5 size-3.5 shrink-0 text-ink-faint" />
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
