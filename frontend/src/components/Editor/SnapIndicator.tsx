import { Line } from 'react-konva';

interface SnapIndicatorProps {
  x: number;
  y: number;
  height: number;
  type: 'playhead' | 'clip-start' | 'clip-end' | 'grid';
}

export function SnapIndicator({ x, y, height, type }: SnapIndicatorProps) {
  const colors = {
    playhead: '#ef4444', // Red
    'clip-start': '#3b82f6', // Blue
    'clip-end': '#3b82f6', // Blue
    grid: '#6b7280', // Gray
  };

  const color = colors[type];

  return (
    <Line
      points={[x, y, x, y + height]}
      stroke={color}
      strokeWidth={2}
      dash={[4, 4]}
      opacity={0.8}
      listening={false}
    />
  );
}
