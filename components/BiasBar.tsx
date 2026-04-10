"use client";

import { cn } from "@/lib/utils";

const BIAS_LABELS = ["LEFT", "CENTER_LEFT", "CENTER", "CENTER_RIGHT", "RIGHT"] as const;
type BiasLabel = (typeof BIAS_LABELS)[number];

const LABEL_COLORS: Record<BiasLabel, string> = {
  LEFT: "bg-blue-600",
  CENTER_LEFT: "bg-blue-400",
  CENTER: "bg-gray-400",
  CENTER_RIGHT: "bg-red-400",
  RIGHT: "bg-red-600",
};

const LABEL_TEXT: Record<BiasLabel, string> = {
  LEFT: "Left",
  CENTER_LEFT: "Center-Left",
  CENTER: "Center",
  CENTER_RIGHT: "Center-Right",
  RIGHT: "Right",
};

interface BiasBarProps {
  score: number; // -2 to +2
  biasLabel?: string;
  sourceName: string;
  summary?: string;
  compact?: boolean;
}

export function BiasBar({ score, biasLabel, sourceName, summary, compact = false }: BiasBarProps) {
  const clampedScore = Math.max(-2, Math.min(2, score));
  // Convert -2..+2 to 0..100% position
  const percent = ((clampedScore + 2) / 4) * 100;

  const label = (biasLabel ?? scoreToLabel(clampedScore)) as BiasLabel;
  const colorClass = LABEL_COLORS[label] ?? "bg-gray-400";

  return (
    <div className={cn("w-full", compact ? "space-y-1" : "space-y-2")}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground truncate">{sourceName}</span>
        <span className={cn("text-xs px-2 py-0.5 rounded-full text-white font-medium", colorClass)}>
          {LABEL_TEXT[label] ?? label}
        </span>
      </div>
      {/* Bias Spectrum Bar */}
      <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-600 via-gray-300 to-red-600">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-foreground shadow-sm"
          style={{ left: `calc(${percent}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Left</span>
        <span>Center</span>
        <span>Right</span>
      </div>
      {!compact && summary && (
        <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
      )}
    </div>
  );
}

function scoreToLabel(score: number): BiasLabel {
  if (score <= -1.5) return "LEFT";
  if (score <= -0.5) return "CENTER_LEFT";
  if (score <= 0.5) return "CENTER";
  if (score <= 1.5) return "CENTER_RIGHT";
  return "RIGHT";
}
