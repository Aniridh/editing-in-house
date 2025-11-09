import React from "react";
import { Rect, Text } from "react-konva";
import type { Clip, Asset } from "../../types";

interface TimelineClipProps {
  clip: Clip;
  asset?: Asset;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (newX: number) => void;
}

export function TimelineClip({
  clip,
  asset,
  x,
  y,
  width,
  height,
  isSelected,
  onSelect,
  onDragEnd,
}: TimelineClipProps) {
  const getTint = () => {
    if (clip.type === "video") return "#1e293b";
    if (clip.type === "overlay") return "#7c3aed";
    if (clip.type === "audio") return "#16a34a";
    return "#475569";
  };

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getTint()}
        stroke={isSelected ? "#7c87ff" : "#232838"}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
        draggable
        onDragEnd={(e) => onDragEnd(e.target.x())}
        onClick={onSelect}
        onTap={onSelect}
      />
      {clip.type === "caption" && clip.text && (
        <Text
          x={x + 4}
          y={y + height / 2 - 6}
          text={clip.text.substring(0, 20)}
          fontSize={10}
          fill="#e5e7eb"
          listening={false}
        />
      )}
    </>
  );
}

