import React from "react";

interface ProgressBarProps {
  progress: number;
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div className="space-y-1">
      {label && <div className="text-xs text-zinc-400">{label}</div>}
      <div className="h-2 bg-[var(--panel)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
