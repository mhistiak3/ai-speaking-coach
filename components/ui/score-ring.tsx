import { cn, scoreColor } from "@/lib/utils";

interface ScoreRingProps {
  score: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

/** Circular score gauge (0–100). Null renders an em-dash "no data" ring. */
export function ScoreRing({
  score,
  size = 92,
  stroke = 8,
  label,
  sublabel,
  className,
}: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const colorClass = scoreColor(score);

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-edge"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            className={cn("transition-[stroke-dashoffset] duration-700", colorClass)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-xl font-bold tabular-nums", colorClass)}>
            {score == null ? "—" : Math.round(score)}
          </span>
          {sublabel && <span className="text-[10px] text-ink-faint">{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-xs font-semibold text-ink-soft">{label}</span>}
    </div>
  );
}

/** Horizontal estimate bar for lists. */
export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
      <div
        className={cn("h-full rounded-full transition-all duration-500", score >= 70 ? "bg-good" : score >= 50 ? "bg-warn" : "bg-bad")}
        style={{ width: `${Math.max(6, Math.min(100, score))}%` }}
      />
    </div>
  );
}
