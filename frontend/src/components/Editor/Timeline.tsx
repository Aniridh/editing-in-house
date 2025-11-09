import React, { useRef, useEffect, useState } from "react";
import { Stage, Layer, Line, Text, Rect } from "react-konva";
import { useEditorStore } from "../../store/editorStore";
import { TimelineTrack } from "./TimelineTrack";
import { Playhead } from "./Playhead";

const RULER_HEIGHT = 30;
const TRACK_HEIGHT = 60;

function timeToPixels(time: number, zoom: number): number {
  return time * zoom;
}

function pixelsToTime(pixels: number, zoom: number): number {
  return pixels / zoom;
}

function formatTimecode(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);
  const [stageHeight, setStageHeight] = useState(200);
  const [scrollLeft, setScrollLeft] = useState(0);

  const clips = useEditorStore((state) => state.clips);
  const assets = useEditorStore((state) => state.assets);
  const playhead = useEditorStore((state) => state.playhead);
  const zoom = useEditorStore((state) => state.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);
  const selectClip = useEditorStore((state) => state.selectClip);
  const moveClip = useEditorStore((state) => state.moveClip);

  const videoClips = clips.filter((c) => c.track === "video");
  const overlayClips = clips.filter((c) => c.track === "overlay");
  const audioClips = clips.filter((c) => c.track === "audio");

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageWidth(containerRef.current.offsetWidth);
        setStageHeight(RULER_HEIGHT + 3 * TRACK_HEIGHT);
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const visibleStart = pixelsToTime(scrollLeft, zoom);
  const visibleEnd = pixelsToTime(scrollLeft + stageWidth, zoom);
  const playheadX = timeToPixels(playhead - visibleStart, zoom);

  const assetsById = Object.fromEntries(assets.map((a) => [a.id, a]));

  return (
    <div ref={containerRef} className="h-full w-full bg-[var(--surface)] border-t border-[var(--border)] overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-[var(--panel)] border-b border-[var(--border)]">
        <label className="text-xs text-zinc-300">Zoom:</label>
        <input
          type="range"
          min={10}
          max={1000}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-xs text-zinc-400">{zoom.toFixed(0)} px/s</span>
      </div>
      <Stage width={stageWidth} height={stageHeight}>
        <Layer>
          {/* Ruler */}
          <Rect x={0} y={0} width={stageWidth} height={RULER_HEIGHT} fill="#0f1115" listening={false} />
          {Array.from({ length: Math.ceil(visibleEnd - visibleStart) + 1 }).map((_, i) => {
            const time = Math.floor(visibleStart) + i;
            const x = timeToPixels(time - visibleStart, zoom);
            return (
              <Line
                key={i}
                points={[x, 0, x, RULER_HEIGHT]}
                stroke="#232838"
                strokeWidth={1}
                listening={false}
              />
            );
          })}
          {Array.from({ length: Math.ceil((visibleEnd - visibleStart) / 10) + 1 }).map((_, i) => {
            const time = Math.floor(visibleStart / 10) * 10 + i * 10;
            const x = timeToPixels(time - visibleStart, zoom);
            return (
              <Text
                key={i}
                x={x + 2}
                y={2}
                text={formatTimecode(time)}
                fontSize={10}
                fill="#a1a1aa"
                listening={false}
              />
            );
          })}
          <Playhead x={playheadX} height={stageHeight} />
        </Layer>
        <TimelineTrack
          trackId="video"
          trackType="video"
          clips={videoClips}
          assetsById={assetsById}
          y={RULER_HEIGHT}
          height={TRACK_HEIGHT}
          zoom={zoom}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          onClipSelect={selectClip}
          onClipDragEnd={(id, newStart) => moveClip(id, newStart)}
        />
        <TimelineTrack
          trackId="overlay"
          trackType="overlay"
          clips={overlayClips}
          assetsById={assetsById}
          y={RULER_HEIGHT + TRACK_HEIGHT}
          height={TRACK_HEIGHT}
          zoom={zoom}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          onClipSelect={selectClip}
          onClipDragEnd={(id, newStart) => moveClip(id, newStart)}
        />
        <TimelineTrack
          trackId="audio"
          trackType="audio"
          clips={audioClips}
          assetsById={assetsById}
          y={RULER_HEIGHT + TRACK_HEIGHT * 2}
          height={TRACK_HEIGHT}
          zoom={zoom}
          visibleStart={visibleStart}
          visibleEnd={visibleEnd}
          onClipSelect={selectClip}
          onClipDragEnd={(id, newStart) => moveClip(id, newStart)}
        />
      </Stage>
    </div>
  );
}
