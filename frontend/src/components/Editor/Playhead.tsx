import { Group, Line } from 'react-konva';
import { timeToPixels } from '../../utils/timeline';

interface PlayheadProps {
  playhead: number;
  zoom: number;
  height: number;
  color?: string;
}

export function Playhead({ playhead, zoom, height, color = '#ff0000' }: PlayheadProps) {
  const x = timeToPixels(playhead, zoom);

  return (
    <Group>
      <Line
        points={[x, 0, x, height]}
        stroke={color}
        strokeWidth={2}
        listening={false}
        hitStrokeWidth={0}
      />
      <Line
        points={[x - 5, 0, x, 10, x + 5, 0]}
        fill={color}
        closed
        listening={false}
        hitStrokeWidth={0}
      />
    </Group>
  );
}
