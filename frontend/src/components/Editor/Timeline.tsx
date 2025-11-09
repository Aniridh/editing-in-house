import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, FastLayer, Line, Text, Rect } from 'react-konva';
import { SnapIndicator } from './SnapIndicator';
import { MarqueeSelection, getClipsInMarquee } from './MarqueeSelection';
import { useEditorStore } from '../../store/editorStore';
import { TimelineTrack } from './TimelineTrack';
import { Playhead } from './Playhead';
import { timeToPixels, pixelsToTime, formatTime, findSnapTarget } from '../../utils/timeline';
import { useThrottledRAF } from '../../hooks/useThrottledRAF';

const RULER_HEIGHT = 30;
const TRACK_HEIGHT = 60;
const MIN_ZOOM = 10;
const MAX_ZOOM = 1000;

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);
  const [stageHeight, setStageHeight] = useState(200);
  const [scrollLeft, setScrollLeft] = useState(0);

  const tracks = useEditorStore((state) => state.tracks);
  const playhead = useEditorStore((state) => state.playhead);
  const zoom = useEditorStore((state) => state.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);
  const selection = useEditorStore((state) => state.selection);
  const setSelection = useEditorStore((state) => state.setSelection);
  const moveClip = useEditorStore((state) => state.moveClip);
  const trimClip = useEditorStore((state) => state.trimClip);
  const splitClip = useEditorStore((state) => state.splitClip);
  const deleteClip = useEditorStore((state) => state.deleteClip);
  const assets = useEditorStore((state) => state.assets);

  // Update stage size on container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageWidth(containerRef.current.offsetWidth);
        setStageHeight(RULER_HEIGHT + tracks.length * TRACK_HEIGHT);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [tracks.length]);

  // Calculate visible time range
  const visibleStart = pixelsToTime(scrollLeft, zoom);
  const visibleEnd = pixelsToTime(scrollLeft + stageWidth, zoom);

  // Memoize time markers calculation
  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const markerInterval = zoom < 50 ? 10 : zoom < 100 ? 5 : 1;
    const startMarker = Math.floor(visibleStart / markerInterval) * markerInterval;
    for (let i = startMarker; i <= visibleEnd; i += markerInterval) {
      markers.push(i);
    }
    return markers;
  }, [visibleStart, visibleEnd, zoom]);

  // Throttle zoom updates with RAF
  const throttledSetZoom = useThrottledRAF((newZoom: number) => {
    setZoom(newZoom);
  }, [setZoom]);

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const delta = e.evt.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));
    throttledSetZoom(newZoom);
  }, [zoom, throttledSetZoom]);


  const handleClipSelect = (clipId: string, multi: boolean) => {
    if (multi) {
      // Toggle: add if not selected, remove if already selected
      if (selection.includes(clipId)) {
        setSelection(selection.filter((id) => id !== clipId));
      } else {
        setSelection([...selection, clipId]);
      }
    } else {
      setSelection([clipId]);
    }
  };

  const setTransition = useEditorStore((state) => state.setTransition);
  const [rippleMode, setRippleMode] = useState(false);
  const [snapIndicator, setSnapIndicator] = useState<{
    x: number;
    type: 'playhead' | 'clip-start' | 'clip-end' | 'grid' | null;
  } | null>(null);
  
  // Marquee selection state
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isMarqueeActive, setIsMarqueeActive] = useState(false);

  // Toggle ripple mode with R key, handle group operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (!e.target || (e.target as HTMLElement).tagName === 'INPUT') return;
        setRippleMode((prev) => !prev);
      }
      
      // Delete selected clips
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length > 0) {
        if (!e.target || (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault();
          selection.forEach((clipId) => deleteClip(clipId, rippleMode));
          setSelection([]);
        }
      }
      
      // Split all selected clips at playhead
      if (e.key === 's' || e.key === 'S') {
        if (!e.target || (e.target as HTMLElement).tagName === 'INPUT') {
          if (e.shiftKey && selection.length > 0) {
            e.preventDefault();
            selection.forEach((clipId) => {
              const clip = tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
              if (clip && playhead > clip.start && playhead < clip.end) {
                splitClip(clipId, playhead);
              }
            });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, rippleMode, playhead, tracks, deleteClip, splitClip, setSelection]);

  const handleClipDragMove = (_clipId: string, _newStart: number, snapResult?: { snappedTime: number; snapTarget: string | null }) => {
    if (snapResult && snapResult.snapTarget) {
      setSnapIndicator({
        x: snapResult.snappedTime,
        type: snapResult.snapTarget as 'playhead' | 'clip-start' | 'clip-end' | 'grid',
      });
    } else {
      setSnapIndicator(null);
    }
  };

  const handleClipDragEnd = (clipId: string, newStart: number, useRipple?: boolean) => {
    const clip = tracks
      .flatMap((t) => t.clips)
      .find((c) => c.id === clipId);
    if (!clip) return;

    // Check if this clip is part of a multi-selection
    if (selection.includes(clipId) && selection.length > 1) {
      // Group move: preserve relative offsets
      const selectedClips = tracks
        .flatMap((t) => t.clips)
        .filter((c) => selection.includes(c.id))
        .sort((a, b) => a.start - b.start);
      
      // Calculate the offset for the dragged clip
      const draggedClip = selectedClips.find((c) => c.id === clipId);
      if (draggedClip) {
        // Get clip boundaries for snapping
        const allClips = tracks.flatMap((t) => t.clips);
        const clipBoundaries = allClips.flatMap((c) => [c.start, c.end]);
        const snapResult = findSnapTarget(newStart, zoom, playhead, clipBoundaries, 0.1);
        const snappedNewStart = snapResult.snappedTime;
        const snappedOffset = snappedNewStart - draggedClip.start;
        
        // Move all selected clips by the same offset
        selectedClips.forEach((c) => {
          const newClipStart = Math.max(0, c.start + snappedOffset);
          moveClip(c.id, c.trackId, newClipStart, false); // Don't ripple when moving group
        });
      }
    } else {
      // Single clip move
      moveClip(clipId, clip.trackId, newStart, useRipple ?? rippleMode);
    }
    
    setSnapIndicator(null);

    // Check if clip is now flush with adjacent clips and auto-create transition
    const track = tracks.find((t) => t.id === clip.trackId);
    if (track) {
      const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
      const clipIndex = sortedClips.findIndex((c) => c.id === clipId);
      const newEnd = newStart + (clip.end - clip.start);
      
      // Check if flush with next clip
      if (clipIndex >= 0 && clipIndex < sortedClips.length - 1) {
        const nextClip = sortedClips[clipIndex + 1];
        if (Math.abs(newEnd - nextClip.start) < 0.01 && !clip.transitionType) {
          // Auto-create crossfade transition
          setTransition(clipId, nextClip.id, 0.5);
        }
      }
      
      // Check if flush with previous clip
      if (clipIndex > 0) {
        const prevClip = sortedClips[clipIndex - 1];
        if (Math.abs(prevClip.end - newStart) < 0.01 && !prevClip.transitionType) {
          // Auto-create crossfade transition
          setTransition(prevClip.id, clipId, 0.5);
        }
      }
    }
  };

  const handleClipTrim = (clipId: string, side: 'left' | 'right', newPoint: number, useRipple?: boolean) => {
    const clip = tracks
      .flatMap((t) => t.clips)
      .find((c) => c.id === clipId);
    if (!clip) return;

    const asset = clip.assetId ? assets.get(clip.assetId) : undefined;
    if (!asset && clip.type !== 'caption') return;

    // Get all clip boundaries for snapping
    const allClips = tracks.flatMap((t) => t.clips);
    const clipBoundaries = allClips.flatMap((c) => [c.start, c.end]);

    // Calculate timeline time for trim point
    const timelineTime = side === 'left' 
      ? clip.start + (newPoint - clip.inPoint)
      : clip.start + (newPoint - clip.inPoint);

    // Find snap target
    const snapResult = findSnapTarget(timelineTime, zoom, playhead, clipBoundaries, 0.1);
    const snappedTimelineTime = snapResult.snappedTime;

    // Convert back to asset time
    const snappedPoint = side === 'left'
      ? clip.inPoint + (snappedTimelineTime - clip.start)
      : clip.inPoint + (snappedTimelineTime - clip.start);

    const duration = asset?.duration || 5;
    const clampedPoint = Math.max(0, Math.min(duration, snappedPoint));

    if (side === 'left') {
      trimClip(clipId, clampedPoint, undefined, useRipple ?? rippleMode);
    } else {
      trimClip(clipId, undefined, clampedPoint, useRipple ?? rippleMode);
    }
    setSnapIndicator(null);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 p-2 bg-gray-900 border-b border-gray-700">
        <label className="text-sm text-gray-300">Zoom:</label>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          value={zoom}
          onChange={handleZoomChange}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          aria-label="Timeline zoom"
        />
        <span className="text-sm text-gray-300 w-20 text-right">
          {zoom.toFixed(0)} px/s
        </span>
        {/* Ripple mode indicator */}
        <div className={`px-2 py-1 rounded text-xs ${rippleMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          Ripple: {rippleMode ? 'ON' : 'OFF'} (R)
        </div>
      </div>

      {/* Timeline canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={(e) => {
          // Throttle scroll updates
          const newScrollLeft = e.currentTarget.scrollLeft;
          requestAnimationFrame(() => {
            setScrollLeft(newScrollLeft);
          });
        }}
      >
        <Stage
          width={stageWidth}
          height={stageHeight}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            // Start marquee selection if clicking on empty area (not on a clip)
            const target = e.target;
            if (target === e.target.getStage() || target.getClassName() === 'Rect' || target.getClassName() === 'Line') {
              const pointerPos = e.target.getStage()?.getPointerPosition();
              if (pointerPos) {
                setIsMarqueeActive(true);
                setMarquee({
                  startX: pointerPos.x,
                  startY: pointerPos.y,
                  endX: pointerPos.x,
                  endY: pointerPos.y,
                });
              }
            }
          }}
          onMouseMove={(e) => {
            if (isMarqueeActive && marquee) {
              const pointerPos = e.target.getStage()?.getPointerPosition();
              if (pointerPos) {
                setMarquee({
                  ...marquee,
                  endX: pointerPos.x,
                  endY: pointerPos.y,
                });
              }
            }
          }}
          onMouseUp={(e) => {
            if (isMarqueeActive && marquee) {
              // Select all clips in marquee
              const selectedClipIds = getClipsInMarquee(
                marquee,
                tracks,
                zoom,
                TRACK_HEIGHT,
                RULER_HEIGHT
              );
              
              if (selectedClipIds.length > 0) {
                // If shift is held, add to selection; otherwise replace
                if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
                  const newSelection = [...new Set([...selection, ...selectedClipIds])];
                  setSelection(newSelection);
                } else {
                  setSelection(selectedClipIds);
                }
              } else if (!e.evt.shiftKey && !e.evt.ctrlKey && !e.evt.metaKey) {
                // Clear selection if clicking empty area without modifiers
                setSelection([]);
              }
              
              setIsMarqueeActive(false);
              setMarquee(null);
            }
          }}
          style={{ display: 'block' }}
        >
          {/* Ruler layer - use FastLayer since no hit-testing needed */}
          <FastLayer>
            <Rect
              width={stageWidth}
              height={RULER_HEIGHT}
              fill="#374151"
              listening={false}
              perfectDrawEnabled={false}
            />
            {timeMarkers.map((time) => {
              const x = timeToPixels(time, zoom) - scrollLeft;
              if (x < -50 || x > stageWidth + 50) return null;
              return (
                <Line
                  key={time}
                  points={[x, 0, x, RULER_HEIGHT]}
                  stroke="#6b7280"
                  strokeWidth={1}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              );
            })}
            {timeMarkers.map((time) => {
              const x = timeToPixels(time, zoom) - scrollLeft;
              if (x < 0 || x > stageWidth) return null;
              return (
                <Text
                  key={`label-${time}`}
                  x={x + 2}
                  y={2}
                  text={formatTime(time)}
                  fontSize={10}
                  fill="#9ca3af"
                  listening={false}
                  perfectDrawEnabled={false}
                />
              );
            })}
            <Line
              points={[0, RULER_HEIGHT, stageWidth, RULER_HEIGHT]}
              stroke="#4b5563"
              strokeWidth={2}
              listening={false}
              perfectDrawEnabled={false}
            />
            {/* Playhead on ruler */}
            <Playhead
              playhead={playhead}
              zoom={zoom}
              height={RULER_HEIGHT}
            />
          </FastLayer>

          {/* Tracks */}
          {tracks.map((track) => (
            <TimelineTrack
              key={track.id}
              track={track}
              zoom={zoom}
              trackHeight={TRACK_HEIGHT}
              visibleStart={visibleStart}
              visibleEnd={visibleEnd}
              onClipSelect={handleClipSelect}
              onClipDragEnd={handleClipDragEnd}
              onClipDragMove={handleClipDragMove}
              onClipTrim={handleClipTrim}
            />
          ))}

          {/* Marquee selection layer */}
          {marquee && isMarqueeActive && (
            <Layer>
              <MarqueeSelection
                startX={marquee.startX}
                startY={marquee.startY}
                endX={marquee.endX}
                endY={marquee.endY}
                zoom={zoom}
                trackHeight={TRACK_HEIGHT}
                rulerHeight={RULER_HEIGHT}
              />
            </Layer>
          )}

          {/* Playhead layer (above tracks) - use FastLayer for performance */}
          <FastLayer>
            <Playhead
              playhead={playhead}
              zoom={zoom}
              height={stageHeight}
            />
            {/* Snap indicator overlay */}
            {snapIndicator && snapIndicator.type && (
              <SnapIndicator
                x={timeToPixels(snapIndicator.x, zoom) - scrollLeft}
                y={0}
                height={stageHeight}
                type={snapIndicator.type}
              />
            )}
          </FastLayer>
        </Stage>
      </div>
    </div>
  );
}
