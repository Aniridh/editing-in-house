import React from "react";
import { Layer, Rect, Text } from "react-konva";
import { TimelineClip } from "./TimelineClip";
import type { Clip, Asset } from "../../types";

interface TimelineTrackProps {
  trackId: string;
  trackType: "video" | "audio" | "overlay";
  clips: Clip[];
  assetsById: Record<string, Asset>;
  y: number;
  height: number;
  zoom: number;
  visibleStart: number;
  visibleEnd: number;
  onClipSelect: (clipId: string) => void;
  onClipDragEnd: (clipId: string, newStart: number) => void;
}

const snap = (t: number) => Math.round(t * 10) / 10;

function timeToPixels(time: number, zoom: number): number {
  return time * zoom;
}

function pixelsToTime(pixels: number, zoom: number): number {
  return pixels / zoom;
}

export function TimelineTrack({
  trackId,
  trackType,
  clips,
  assetsById,
  y,
  height,
  zoom,
  visibleStart,
  visibleEnd,
  onClipSelect,
  onClipDragEnd,
}: TimelineTrackProps) {
  const visibleClips = clips.filter(
    (c) => c.track === trackType && c.end >= visibleStart && c.start <= visibleEnd
  );

  return (
    <Layer>
      <Rect x={0} y={y} width={10000} height={height} fill="#0f1115" listening={false} />
      <Text
        x={4}
        y={y + height / 2 - 6}
        text={trackType === "video" ? "V1" : trackType === "overlay" ? "VO" : "A1"}
        fontSize={10}
        fill="#a1a1aa"
        listening={false}
      />
      {visibleClips.map((clip) => {
        const clipStart = Math.max(clip.start, visibleStart);
        const clipEnd = Math.min(clip.end, visibleEnd);
        const clipX = timeToPixels(clipStart - visibleStart, zoom);
        const clipWidth = timeToPixels(clipEnd - clipStart, zoom);
        return (
          <TimelineClip
            key={clip.id}
            clip={clip}
            asset={clip.assetId ? assetsById[clip.assetId] : undefined}
            x={clipX}
            y={y + 2}
            width={Math.max(20, clipWidth)}
            height={height - 4}
            isSelected={false}
            onSelect={() => onClipSelect(clip.id)}
            onDragEnd={(newX) => {
              const newStart = visibleStart + pixelsToTime(newX, zoom);
              onClipDragEnd(clip.id, snap(newStart));
            }}
          />
        );
      })}
    </Layer>
  );
}
