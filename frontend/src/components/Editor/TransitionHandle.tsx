import { Group, Rect, Line, Text } from 'react-konva';
import { useState } from 'react';

interface TransitionHandleProps {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
  zoom: number;
  onDrag: (newDuration: number) => void;
}

export function TransitionHandle({
  x,
  y,
  width,
  height,
  duration,
  zoom,
  onDrag,
}: TransitionHandleProps) {
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragStartWidth, setDragStartWidth] = useState<number | null>(null);

  const handleDragStart = (e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPos = stage.getPointerPosition();
    if (pointerPos) {
      setDragStartX(pointerPos.x);
      setDragStartWidth(width);
    }
  };

  const handleDragMove = (e: any) => {
    if (dragStartX === null || dragStartWidth === null) return;
    
    const stage = e.target.getStage();
    if (!stage) return;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const deltaX = pointerPos.x - dragStartX;
    const newWidth = Math.max(10, dragStartWidth + deltaX);
    const newDuration = newWidth / zoom;
    const clampedDuration = Math.max(0.25, Math.min(1.5, newDuration));
    onDrag(clampedDuration);
  };

  const handleDragEnd = () => {
    setDragStartX(null);
    setDragStartWidth(null);
  };

  return (
    <Group
      x={x}
      y={y}
      draggable={false}
    >
      {/* Transition indicator */}
      <Rect
        width={width}
        height={height}
        fill="rgba(139, 92, 246, 0.3)"
        stroke="#8b5cf6"
        strokeWidth={2}
        cornerRadius={2}
        listening={false}
      />
      
      {/* Diagonal lines indicating crossfade */}
      <Line
        points={[0, 0, width, height]}
        stroke="#a78bfa"
        strokeWidth={1}
        listening={false}
      />
      <Line
        points={[0, height, width, 0]}
        stroke="#a78bfa"
        strokeWidth={1}
        listening={false}
      />

      {/* Duration label */}
      {width > 40 && (
        <Text
          x={width / 2 - 20}
          y={height / 2 - 6}
          text={`${duration.toFixed(2)}s`}
          fontSize={10}
          fill="#ffffff"
          width={40}
          align="center"
          listening={false}
        />
      )}

      {/* Drag handle */}
      <Rect
        x={width - 6}
        y={0}
        width={6}
        height={height}
        fill="#8b5cf6"
        cornerRadius={[0, 2, 2, 0]}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />
    </Group>
  );
}
