import React from "react";
import { useEditorStore } from "../../store/editorStore";
import type { Clip } from "../../types";

export function AssetBin() {
  const assets = useEditorStore((state) => state.assets);
  const insertClip = useEditorStore((state) => state.insertClip);
  const playhead = useEditorStore((state) => state.playhead);

  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData("assetId", assetId);
  };

  const handleInsertAtPlayhead = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const clip: Clip = {
      id: `clip-${Date.now()}`,
      assetId,
      type: asset.kind === "video" ? "video" : asset.kind === "image" ? "image" : "audio",
      track: asset.kind === "audio" ? "audio" : "video",
      start: playhead,
      end: playhead + (asset.meta?.duration || 5),
    };
    insertClip(clip);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--panel)]">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Assets</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {assets.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            <p className="text-xs">No assets yet</p>
            <p className="text-[10px] text-zinc-400 mt-1">Generate content to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset.id)}
                className="bg-[var(--bg)] rounded-lg p-2 border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-move"
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 bg-[var(--accent)] rounded text-white font-medium uppercase">
                    {asset.kind}
                  </span>
                </div>
                {asset.thumb && (
                  <img src={asset.thumb} alt="" className="w-full h-16 object-cover rounded mt-1" />
                )}
                <button
                  onClick={() => handleInsertAtPlayhead(asset.id)}
                  className="w-full mt-2 text-xs py-1 bg-[var(--surface)] hover:bg-[var(--panel)] text-zinc-300 rounded"
                >
                  Insert
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


