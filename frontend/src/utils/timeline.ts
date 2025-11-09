/**
 * Format time in seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Convert time in seconds to pixels based on zoom level
 */
export function timeToPixels(time: number, zoom: number): number {
  return time * zoom;
}

/**
 * Convert pixels to time in seconds based on zoom level
 */
export function pixelsToTime(pixels: number, zoom: number): number {
  return pixels / zoom;
}

/**
 * Snap time to grid
 */
export function snapToGrid(time: number, gridInterval: number = 1): number {
  return Math.round(time / gridInterval) * gridInterval;
}

/**
 * Get visible time range for viewport
 */
export function getVisibleTimeRange(
  scrollLeft: number,
  width: number,
  zoom: number
): { start: number; end: number } {
  const start = pixelsToTime(scrollLeft, zoom);
  const end = pixelsToTime(scrollLeft + width, zoom);
  return { start, end };
}

/**
 * Snap detection result
 */
export interface SnapResult {
  snappedTime: number;
  snapTarget: 'playhead' | 'clip-start' | 'clip-end' | 'grid' | null;
  snapDistance: number; // in pixels
}

const SNAP_THRESHOLD_PX = 4;

/**
 * Find snap target for a given time position
 */
export function findSnapTarget(
  time: number,
  zoom: number,
  playhead: number,
  clipBoundaries: number[],
  gridInterval: number = 0.1
): SnapResult {
  const timePx = timeToPixels(time, zoom);
  let bestSnap: SnapResult = {
    snappedTime: time,
    snapTarget: null,
    snapDistance: Infinity,
  };

  // Snap to playhead
  const playheadPx = timeToPixels(playhead, zoom);
  const playheadDistance = Math.abs(timePx - playheadPx);
  if (playheadDistance < SNAP_THRESHOLD_PX && playheadDistance < bestSnap.snapDistance) {
    bestSnap = {
      snappedTime: playhead,
      snapTarget: 'playhead',
      snapDistance: playheadDistance,
    };
  }

  // Snap to grid
  const gridSnapped = snapToGrid(time, gridInterval);
  const gridPx = timeToPixels(gridSnapped, zoom);
  const gridDistance = Math.abs(timePx - gridPx);
  if (gridDistance < SNAP_THRESHOLD_PX && gridDistance < bestSnap.snapDistance) {
    bestSnap = {
      snappedTime: gridSnapped,
      snapTarget: 'grid',
      snapDistance: gridDistance,
    };
  }

  // Snap to clip boundaries (prioritize over grid, but not over playhead)
  for (const boundary of clipBoundaries) {
    const boundaryPx = timeToPixels(boundary, zoom);
    const boundaryDistance = Math.abs(timePx - boundaryPx);
    if (boundaryDistance < SNAP_THRESHOLD_PX && boundaryDistance < bestSnap.snapDistance) {
      // Use 'clip-start' as default (visual indicator will still work)
      // In a more sophisticated implementation, we'd check if boundary matches clip.start or clip.end
      bestSnap = {
        snappedTime: boundary,
        snapTarget: 'clip-start',
        snapDistance: boundaryDistance,
      };
    }
  }

  return bestSnap;
}
