import { Rect } from 'react-konva';
import type { Clip } from '../../types';
import { pixelsToTime, timeToPixels } from '../../utils/timeline';

interface MarqueeSelectionProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  zoom: number;
  trackHeight: number;
  rulerHeight: number;
}

export function MarqueeSelection({
  startX,
  startY,
  endX,
  endY,
  zoom,
  trackHeight,
  rulerHeight,
}: MarqueeSelectionProps) {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(59, 130, 246, 0.2)"
      stroke="rgba(59, 130, 246, 0.8)"
      strokeWidth={1}
      dash={[5, 5]}
      listening={false}
    />
  );
}

/**
 * Find all clips that intersect with the marquee selection rectangle
 */
export function getClipsInMarquee(
  marquee: { startX: number; startY: number; endX: number; endY: number },
  tracks: Array<{ id: string; clips: Clip[] }>,
  zoom: number,
  trackHeight: number,
  rulerHeight: number
): string[] {
  const selectedClipIds: string[] = [];
  
  const marqueeStartX = Math.min(marquee.startX, marquee.endX);
  const marqueeEndX = Math.max(marquee.startX, marquee.endX);
  const marqueeStartY = Math.min(marquee.startY, marquee.endY);
  const marqueeEndY = Math.max(marquee.startY, marquee.endY);

  // Convert marquee bounds to time
  const marqueeStartTime = pixelsToTime(marqueeStartX, zoom);
  const marqueeEndTime = pixelsToTime(marqueeEndX, zoom);

  // Calculate which tracks are in the marquee
  tracks.forEach((track, trackIndex) => {
    const trackY = rulerHeight + trackIndex * trackHeight;
    const trackYEnd = trackY + trackHeight;

    // Check if this track intersects the marquee
    if (trackY < marqueeEndY && trackYEnd > marqueeStartY) {
      // Check all clips in this track
      track.clips.forEach((clip) => {
        const clipStartX = timeToPixels(clip.start, zoom);
        const clipEndX = timeToPixels(clip.end, zoom);

        // Check if clip intersects marquee horizontally
        if (clipEndX >= marqueeStartX && clipStartX <= marqueeEndX) {
          selectedClipIds.push(clip.id);
        }
      });
    }
  });

  return selectedClipIds;
}
