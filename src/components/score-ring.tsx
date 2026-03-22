"use client";

import { useState } from "react";
import { scoreColor } from "@/lib/score-color";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Extremely Hot — massive cross-platform buzz";
  if (score >= 60) return "Very Hot — strong activity across sources";
  if (score >= 40) return "Warm — moderate interest building";
  if (score >= 20) return "Cool — niche or early-stage interest";
  return "Cold — minimal activity detected";
}

export function ScoreRing({
  score,
  size = 56,
  strokeWidth = 4,
  className = "",
}: ScoreRingProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1s ease-out",
          }}
        />
      </svg>
      <span
        className="absolute text-sm font-bold"
        style={{ color }}
      >
        {score}
      </span>

      {showTooltip && (
        <div className="absolute -top-2 right-0 -translate-y-full z-50 px-3 py-2 bg-text text-surface text-xs rounded-lg shadow-lg w-[210px] leading-snug pointer-events-none">
          <div className="font-semibold mb-0.5">Trend Score: {score}/100</div>
          <div className="opacity-80">{scoreLabel(score)}</div>
          <div className="opacity-60 mt-1">Google 35% + Reddit 25% + HN 20% + Wiki 20%</div>
          <div className="absolute right-5 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-text" />
        </div>
      )}
    </div>
  );
}
