import React from "react";
import { useEditorStore } from "../store/editorStore";

function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
}

export function StatusBar() {
  const playhead = useEditorStore((state) => state.playhead);
  const duration = useEditorStore((state) => state.duration);
  const zoom = useEditorStore((state) => state.zoom);
  const jobs = useEditorStore((state) => state.jobs);

  const activeJobs = Object.values(jobs).filter(
    (j) => j.status === "queued" || j.status === "generating"
  ).length;

  return (
    <div className="h-7 bg-[var(--surface)] border-t border-[var(--border)] px-3 flex items-center justify-between text-xs text-zinc-400">
      <div className="flex items-center gap-3">
        <span className="font-mono tabular-nums">{formatTimecode(playhead)}</span>
        <span className="text-zinc-500">/</span>
        <span className="font-mono tabular-nums">{formatTimecode(duration)}</span>
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span>Space: Play/Pause</span>
        <span>•</span>
        <span>S: Split</span>
        <span>•</span>
        <span>+/-: Zoom</span>
      </div>
      <div className="flex items-center gap-3">
        <span>Zoom: {zoom.toFixed(0)}%</span>
        {activeJobs > 0 && (
          <>
            <span className="text-zinc-500">•</span>
            <span className="text-[var(--accent)]">{activeJobs} job{activeJobs !== 1 ? "s" : ""}</span>
          </>
        )}
      </div>
    </div>
  );
}
