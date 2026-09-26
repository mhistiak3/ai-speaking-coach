import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 13)
      : Math.random().toString(36).slice(2, 15);
  return `${prefix}${rand}`;
}

/** Seconds -> "m:ss" or "h:mm:ss" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Normalize words for pronunciation-comparison (case/punctuation agnostic). */
export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\u0980-\u09ff\u0600-\u06ff\u3040-\u30ff\uac00-\ud7af]/g, "");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** 0–1 similarity between two strings. */
export function similarity(a: string, b: string): number {
  const na = normalizeWord(a);
  const nb = normalizeWord(b);
  if (!na && !nb) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length, 1);
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const FILLER_WORDS = new Set([
  "um", "uh", "erm", "er", "hmm", "like", "yeah", "you", "know", "well",
  "actually", "basically", "literally", "stuff", "kinda", "sorta", "ই", "আই",
]);

/** Rough filler count in a transcript — heuristic, not a measurement. */
export function countFillers(text: string): number {
  const words = text.toLowerCase().split(/[^a-z']+/).filter(Boolean);
  let count = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (FILLER_WORDS.has(w)) {
      // "you know" counts once
      if (w === "you" && words[i + 1] === "know") continue;
      count++;
    }
  }
  return count;
}

/** Consecutive repeated words ("I went I went") — heuristic. */
export function countRepeats(text: string): number {
  const words = text.toLowerCase().split(/[^a-z']+/).filter(Boolean);
  let count = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1]) count++;
  }
  return count;
}

export function toPercent(score: number | null | undefined): string | null {
  if (score == null) return null;
  return `${Math.round(score)}%`;
}

export function scoreColor(score: number | null): string {
  if (score == null) return "text-zinc-400";
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-lime-400";
  if (score >= 55) return "text-amber-400";
  return "text-rose-400";
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
