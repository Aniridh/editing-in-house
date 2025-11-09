import React, { useState, useEffect, useRef } from "react";
import { useEditorStore } from "../../store/editorStore";
import { useAudioEngine } from "../../hooks/useAudioEngine";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface PreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function Preview({ videoRef, containerRef }: PreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number>();

  const playhead = useEditorStore((state) => state.playhead);
  const setPlayhead = useEditorStore((state) => state.setPlayhead);
  const clips = useEditorStore((state) => state.clips);
  const assets = useEditorStore((state) => state.assets);

  const activeClips = clips.filter((c) => playhead >= c.start && playhead <= c.end);
  const videoClip = activeClips.find((c) => c.type === "video" || c.type === "image");
  const captionClips = activeClips.filter((c) => c.type === "caption");

  const asset = videoClip?.assetId ? assets.find((a) => a.id === videoClip.assetId) : null;

  useAudioEngine({
    isPlaying,
    playhead,
    clips,
    assetsById: Object.fromEntries(assets.map((a) => [a.id, a])),
  });

  useEffect(() => {
    if (isPlaying) {
      const update = () => {
        setCurrentTime((prev) => {
          const next = prev + 0.033; // ~30fps
          setPlayhead(next);
          return next;
        });
        rafRef.current = requestAnimationFrame(update);
      };
      rafRef.current = requestAnimationFrame(update);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [isPlaying, setPlayhead]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div ref={containerRef} className="h-full bg-black flex items-center justify-center relative">
      {asset && videoClip ? (
        <>
          <video
            ref={videoRef}
            src={asset.url}
            className="max-w-full max-h-full"
            crossOrigin="anonymous"
            playsInline
          />
          {captionClips.map((clip) => (
            <div
              key={clip.id}
              className="absolute"
              style={{
                left: `${(clip.x || 0.5) * 100}%`,
                top: `${(clip.y || 0.5) * 100}%`,
                transform: "translate(-50%, -50%)",
                fontSize: `${clip.fontSize || 24}px`,
                color: clip.color || "#ffffff",
                backgroundColor: clip.bg || "transparent",
                opacity: clip.opacity || 1,
                textAlign: clip.align || "center",
              }}
            >
              {clip.text}
            </div>
          ))}
        </>
      ) : (
        <div className="text-zinc-500 text-center">
          <p className="text-base">No clip at playhead</p>
          <p className="text-xs mt-2">Add clips to the timeline to preview</p>
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[var(--surface)]/90 backdrop-blur-sm rounded-lg p-3 border border-[var(--border)]">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="w-8 h-8 flex items-center justify-center bg-[var(--accent)] hover:bg-[#6b75ff] rounded text-white"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <div className="flex items-center gap-2 text-xs text-zinc-300 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-400">{formatTime(playhead)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
