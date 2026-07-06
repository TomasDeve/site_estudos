interface Props {
  /** 0 a 100 */
  value: number;
  /** cor CSS do preenchimento; default dourado */
  color?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };

export function ProgressBar({ value, color, size = "md", showLabel = false, className = "" }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = color ?? "var(--color-gold)";
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`flex-1 overflow-hidden rounded-full bg-navy-900 ${heights[size]}`}>
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${fill}, ${fill}cc)`,
            boxShadow: pct > 0 ? `0 0 8px ${fill}55` : undefined,
          }}
        />
      </div>
      {showLabel && (
        <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-dim">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
