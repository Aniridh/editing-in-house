import React from "react";
import { Line } from "react-konva";

interface PlayheadProps {
  x: number;
  height: number;
}

export function Playhead({ x, height }: PlayheadProps) {
  return (
    <Line
      points={[x, 0, x, height]}
      stroke="#ef4444"
      strokeWidth={2}
      listening={false}
    />
  );
}

