import { ArrowDownRight, ArrowUpRight, Minus, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverPrimitive } from "@/components/ui/popover";
import React from "react";

export function Kpi({
  label,
  value,
  delta,
  hint,
  infoText,
  infoContent,
  tone = "neutral",
  invert = false,
  className = "",
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  infoText?: string;
  infoContent?: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "negative";
  invert?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "warning"
        ? "text-warning"
        : tone === "negative"
          ? "text-negative"
          : "text-foreground";

  const good = delta === undefined ? null : invert ? delta <= 0 : delta >= 0;
  const Icon = delta === undefined || Math.abs(delta) < 0.05 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={`rounded-xl bg-surface px-4 py-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {(infoText || infoContent) && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                <Info className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-80 text-sm p-4 leading-relaxed bg-slate-900 border-slate-800 shadow-xl z-50">
              {infoContent || infoText}
              <PopoverPrimitive.Arrow className="fill-slate-900" width={16} height={8} />
            </PopoverContent>
          </Popover>
        )}
      </div>
      <p className={`mt-1.5 text-[22px] font-semibold leading-none tabular-nums md:text-2xl ${toneClass}`}>{value}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
        {delta !== undefined && (
          <span 
            className={`inline-flex items-center gap-0.5 tabular-nums cursor-help ${good ? "text-positive" : "text-negative"}`}
            title="Comparação de crescimento ou queda em relação ao período anterior"
          >
            <Icon className="h-3 w-3" />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
