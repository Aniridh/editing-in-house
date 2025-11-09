import React from "react";
import { useEditorStore } from "../../store/editorStore";
import type { Clip } from "../../types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Inspector() {
  const selection = useEditorStore((state) => state.selection);
  const clips = useEditorStore((state) => state.clips);
  const assets = useEditorStore((state) => state.assets);
  const updateClip = useEditorStore((state) => state.updateClip);

  const selectedClip = selection?.clipId
    ? clips.find((c) => c.id === selection.clipId)
    : null;

  if (!selectedClip) {
    return (
      <div className="h-full bg-[var(--panel)] border-l border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Inspector</h2>
        <p className="text-xs text-zinc-400">Select a clip to view its properties</p>
      </div>
    );
  }

  const asset = selectedClip.assetId ? assets.find((a) => a.id === selectedClip.assetId) : null;

  return (
    <div className="h-full bg-[var(--panel)] border-l border-[var(--border)] overflow-auto">
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Inspector</h2>
        <p className="text-xs text-zinc-400">{selectedClip.type}</p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Timeline</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">Start</label>
              <input
                type="text"
                value={formatTime(selectedClip.start)}
                readOnly
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-xs text-zinc-300"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">End</label>
              <input
                type="text"
                value={formatTime(selectedClip.end)}
                readOnly
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-xs text-zinc-300"
              />
            </div>
          </div>
        </div>
        {selectedClip.type === "caption" && (
          <div className="space-y-3 pt-3 border-t border-[var(--border)]">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Text</label>
              <textarea
                value={selectedClip.text || ""}
                onChange={(e) => updateClip(selectedClip.id, { text: e.target.value })}
                className="w-full p-2 bg-[var(--bg)] text-zinc-200 rounded border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-0.5">X (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={selectedClip.x ?? 0.5}
                    onChange={(e) => updateClip(selectedClip.id, { x: parseFloat(e.target.value) })}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-0.5">Y (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={selectedClip.y ?? 0.5}
                    onChange={(e) => updateClip(selectedClip.id, { y: parseFloat(e.target.value) })}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-xs text-zinc-200"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Font Size</label>
              <input
                type="number"
                min="12"
                max="72"
                value={selectedClip.fontSize || 24}
                onChange={(e) => updateClip(selectedClip.id, { fontSize: parseInt(e.target.value, 10) })}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-xs text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Color</label>
              <input
                type="color"
                value={selectedClip.color || "#ffffff"}
                onChange={(e) => updateClip(selectedClip.id, { color: e.target.value })}
                className="w-full h-8 bg-[var(--bg)] border border-[var(--border)] rounded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
