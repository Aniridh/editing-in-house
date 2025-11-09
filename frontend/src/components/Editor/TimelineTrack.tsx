import { Layer, Rect } from 'react-konva';
import type { Track, Clip } from '../../types';
import { TimelineClip } from './TimelineClip';
import { TransitionHandle } from './TransitionHandle';
import { useEditorStore } from '../../store/editorStore';
import { timeToPixels } from '../../utils/timeline';
import { useMemo } from 'react';

interface TimelineTrackProps {
  track: Track;
  zoom: number;
  trackHeight: number;
  visibleStart: number;
  visibleEnd: number;
  onClipSelect: (clipId: string, multi: boolean) => void;
  onClipDragEnd: (clipId: string, newStart: number, useRipple?: boolean) => void;
  onClipDragMove?: (clipId: string, newStart: number, snapResult?: { snappedTime: number; snapTarget: string | null }) => void;
  onClipTrim: (clipId: string, side: 'left' | 'right', newPoint: number, useRipple?: boolean) => void;
}

export function TimelineTrack({
  track,
  zoom,
  trackHeight,
  visibleStart,
  visibleEnd,
  onClipSelect,
  onClipDragEnd,
  onClipDragMove,
  onClipTrim,
}: TimelineTrackProps) {
  const selection = useEditorStore((state) => state.selection);
  const assets = useEditorStore((state) => state.assets);
  const playhead = useEditorStore((state) => state.playhead);
  const allTracks = useEditorStore((state) => state.tracks);
  const allClips = allTracks.flatMap((t) => t.clips);
  const setTransition = useEditorStore((state) => state.setTransition);
  const removeTransition = useEditorStore((state) => state.removeTransition);

  // Memoize visible clips calculation
  const visibleClips = useMemo(() => {
    return track.clips.filter(
      (clip) => clip.end >= visibleStart && clip.start <= visibleEnd
    );
  }, [track.clips, visibleStart, visibleEnd]);

  // Find adjacent clips (clips that touch each other)
  const adjacentPairs: Array<{ from: Clip; to: Clip }> = [];
  const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sortedClips.length - 1; i++) {
    const current = sortedClips[i];
    const next = sortedClips[i + 1];
    // Clips are adjacent if they're on the same track and end/start are very close (within 0.01s)
    if (current.trackId === next.trackId && Math.abs(current.end - next.start) < 0.01) {
      adjacentPairs.push({ from: current, to: next });
    }
  }

  const handleTransitionDurationChange = (fromClipId: string, newDuration: number) => {
    const fromClip = track.clips.find((c) => c.id === fromClipId);
    if (fromClip?.transitionToClipId) {
      setTransition(fromClipId, fromClip.transitionToClipId, newDuration);
    }
  };

  return (
    <Layer>
      {/* Track background */}
      <Rect
        width={10000} // Large enough for scrolling
        height={trackHeight}
        fill={track.type === 'video' ? '#1f2937' : '#111827'}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Clips */}
      {visibleClips.map((clip) => {
        const asset = assets.get(clip.assetId);
        return (
          <TimelineClip
            key={clip.id}
            clip={clip}
            zoom={zoom}
            trackHeight={trackHeight}
            isSelected={selection.includes(clip.id)}
            onSelect={onClipSelect}
            onDragEnd={onClipDragEnd}
            onDragMove={onClipDragMove}
            onTrim={onClipTrim}
            assetName={asset?.url.split('/').pop()?.split('?')[0]}
            asset={asset}
            playhead={playhead}
            allClips={allClips}
          />
        );
      })}

      {/* Transition handles */}
      {adjacentPairs
        .filter((pair) => {
          const fromVisible = pair.from.end >= visibleStart && pair.from.start <= visibleEnd;
          const toVisible = pair.to.end >= visibleStart && pair.to.start <= visibleEnd;
          return fromVisible || toVisible;
        })
        .map((pair) => {
          const transitionDuration = pair.from.transitionDuration || 0.5;
          const transitionWidth = timeToPixels(transitionDuration, zoom);
          const transitionX = timeToPixels(pair.from.end - transitionDuration, zoom);
          
          // Only show if transition exists or clips are flush
          if (pair.from.transitionType === 'crossfade' || Math.abs(pair.from.end - pair.to.start) < 0.01) {
            return (
              <TransitionHandle
                key={`transition-${pair.from.id}-${pair.to.id}`}
                x={transitionX}
                y={2}
                width={transitionWidth}
                height={trackHeight - 4}
                duration={transitionDuration}
                zoom={zoom}
                onDrag={(newDuration) => {
                  if (pair.from.transitionType === 'crossfade') {
                    handleTransitionDurationChange(pair.from.id, newDuration);
                  } else {
                    // Auto-create transition when dragging handle
                    setTransition(pair.from.id, pair.to.id, newDuration);
                  }
                }}
              />
            );
          }
          return null;
        })}
    </Layer>
  );
}
