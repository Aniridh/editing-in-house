import { Group, Rect, Text, Image, Line } from 'react-konva';
import type { Clip, Asset } from '../../types';
import { timeToPixels, findSnapTarget } from '../../utils/timeline';
import { useState, useMemo, memo } from 'react';
import useImage from 'use-image';

interface TimelineClipProps {
  clip: Clip;
  zoom: number;
  trackHeight: number;
  isSelected: boolean;
  onSelect: (clipId: string, multi: boolean) => void;
  onDragEnd: (clipId: string, newStart: number, useRipple?: boolean) => void;
  onDragMove?: (clipId: string, newStart: number, snapResult?: { snappedTime: number; snapTarget: string | null }) => void;
  onTrim: (clipId: string, side: 'left' | 'right', newPoint: number, useRipple?: boolean) => void;
  onTrimMove?: (clipId: string, side: 'left' | 'right', newPoint: number, snapResult?: { snappedTime: number; snapTarget: string | null }) => void;
  assetName?: string;
  asset?: Asset;
  playhead?: number;
  allClips?: Clip[];
}

const TRIM_HANDLE_WIDTH = 8;

// Memoized TimelineClip component for performance
export const TimelineClip = memo(function TimelineClip({
  clip,
  zoom,
  trackHeight,
  isSelected,
  onSelect,
  onDragEnd,
  onDragMove,
  onTrim,
  onTrimMove,
  assetName,
  asset,
  playhead = 0,
  allClips = [],
}: TimelineClipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isTrimming, setIsTrimming] = useState<'left' | 'right' | null>(null);
  const [trimStart, setTrimStart] = useState<number | null>(null);

  const x = timeToPixels(clip.start, zoom);
  const width = timeToPixels(clip.end - clip.start, zoom);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragMove = (e: any) => {
    if (isTrimming) {
      const newX = e.target.x();
      const newTime = (newX - x) / zoom + clip.start;
      
      // Get clip boundaries for snapping
      const clipBoundaries = allClips.flatMap((c) => [c.start, c.end]);
      const timelineTime = isTrimming === 'left' 
        ? clip.start + (newTime - clip.start)
        : clip.end + (newTime - clip.end);
      
      const snapResult = findSnapTarget(timelineTime, zoom, playhead, clipBoundaries, 0.1);
      const snappedTime = snapResult.snappedTime;
      
      if (isTrimming === 'left') {
        const snappedInPoint = clip.inPoint + (snappedTime - clip.start);
        setTrimStart(snappedTime);
        if (onTrimMove) {
          onTrimMove(clip.id, 'left', snappedInPoint, snapResult);
        }
      } else {
        const snappedOutPoint = clip.outPoint + (snappedTime - clip.end);
        setTrimStart(snappedTime);
        if (onTrimMove) {
          onTrimMove(clip.id, 'right', snappedOutPoint, snapResult);
        }
      }
    } else if (isDragging) {
      const newX = e.target.x();
      const newTime = Math.max(0, newX / zoom);
      
      // Get clip boundaries for snapping
      const clipBoundaries = allClips.flatMap((c: Clip) => [c.start, c.end]);
      const snapResult = findSnapTarget(newTime, zoom, playhead, clipBoundaries, 0.1);
      
      if (onDragMove) {
        onDragMove(clip.id, snapResult.snappedTime, snapResult);
      }
    }
  };

  const handleDragEnd = (e: any) => {
    setIsDragging(false);
    
    if (isTrimming && trimStart !== null) {
      if (isTrimming === 'left') {
        const newInPoint = clip.inPoint + (trimStart - clip.start);
        onTrim(clip.id, 'left', Math.max(0, newInPoint), e.evt.shiftKey);
      } else if (isTrimming === 'right') {
        const newOutPoint = clip.outPoint + (trimStart - clip.end);
        onTrim(clip.id, 'right', newOutPoint, e.evt.shiftKey);
      }
      setIsTrimming(null);
      setTrimStart(null);
    } else {
      const newX = e.target.x();
      const newStart = Math.max(0, newX / zoom);
      
      // Get clip boundaries for snapping
      const clipBoundaries = allClips.flatMap((c: Clip) => [c.start, c.end]);
      const snapResult = findSnapTarget(newStart, zoom, playhead, clipBoundaries, 0.1);
      
      onDragEnd(clip.id, snapResult.snappedTime, e.evt.shiftKey);
    }
  };

  const handleClick = (e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const localX = pointerPos.x - x;

    // Check if clicking on trim handles
    if (localX < TRIM_HANDLE_WIDTH) {
      setIsTrimming('left');
      setTrimStart(clip.start);
      return;
    }
    if (localX > width - TRIM_HANDLE_WIDTH) {
      setIsTrimming('right');
      setTrimStart(clip.end);
      return;
    }

    // Regular click - select clip
    onSelect(clip.id, e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey);
  };

  // Different colors for caption clips
  const isCaption = clip.type === 'caption';
  const isVideo = asset?.type === 'video';
  const isAudio = asset?.type === 'audio' || asset?.type === 'voiceover';
  
  const clipColor = isCaption
    ? (isSelected ? '#10b981' : '#34d399')
    : (isSelected ? '#3b82f6' : '#60a5fa');
  const strokeColor = isCaption
    ? (isSelected ? '#059669' : '#10b981')
    : (isSelected ? '#2563eb' : '#3b82f6');

  // Calculate which thumbnails to show (repeating pattern)
  const thumbnailUrls = useMemo(() => {
    if (!isVideo || !asset?.metadata?.thumbnails || !asset.metadata.thumbnails.length) {
      return [];
    }
    const thumbnails = asset.metadata.thumbnails;
    const clipDuration = clip.end - clip.start;
    const assetDuration = asset.duration || clipDuration;
    
    // Calculate thumbnail interval (1 second per thumbnail)
    const thumbnailInterval = assetDuration / thumbnails.length;
    
    // Calculate how many thumbnails fit in the clip width (min 1 per 20px for performance)
    const minThumbnailWidth = 20;
    const maxThumbnails = Math.max(1, Math.floor(width / minThumbnailWidth));
    const numThumbnails = Math.min(maxThumbnails, Math.ceil(clipDuration / thumbnailInterval));
    
    const urls: string[] = [];
    for (let i = 0; i < numThumbnails; i++) {
      const timeInClip = (i * clipDuration) / numThumbnails;
      const timeInAsset = (clip.inPoint + timeInClip) % assetDuration;
      const thumbnailIndex = Math.floor((timeInAsset / assetDuration) * thumbnails.length);
      urls.push(thumbnails[Math.min(thumbnailIndex, thumbnails.length - 1)]);
    }
    
    return urls;
  }, [clip.start, clip.end, clip.inPoint, width, isVideo, asset]);

  // Calculate waveform points for audio (downsampled for performance)
  const waveformPoints = useMemo(() => {
    if (!isAudio || !asset?.metadata?.waveform || !asset.metadata.waveform.length) {
      return null;
    }
    const waveform = asset.metadata.waveform;
    const clipDuration = clip.end - clip.start;
    const assetDuration = asset.duration || clipDuration;
    
    // Calculate which portion of waveform to show based on inPoint/outPoint
    const startRatio = clip.inPoint / assetDuration;
    const endRatio = clip.outPoint / assetDuration;
    const startSample = Math.floor(startRatio * waveform.length);
    const endSample = Math.floor(endRatio * waveform.length);
    const visibleWaveform = waveform.slice(startSample, endSample);
    
    // Downsample based on clip width (max 2 pixels per sample for performance)
    const maxSamples = Math.max(1, Math.floor(width / 2));
    const step = Math.max(1, Math.floor(visibleWaveform.length / maxSamples));
    
    const points: number[] = [];
    const centerY = trackHeight / 2;
    const maxAmplitude = (trackHeight - 8) / 2;
    
    for (let i = 0; i < visibleWaveform.length; i += step) {
      const amplitude = visibleWaveform[i] || 0;
      const x = (i / visibleWaveform.length) * width;
      const yTop = centerY - (amplitude * maxAmplitude);
      const yBottom = centerY + (amplitude * maxAmplitude);
      points.push(x, yTop, x, yBottom);
    }
    
    return points;
  }, [isAudio, asset, clip, width, trackHeight]);

  return (
    <Group
      x={x}
      y={0}
      draggable
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      {/* Background with thumbnail or waveform */}
      {isVideo && thumbnailUrls.length > 0 ? (
        <ThumbnailBackground
          thumbnailUrls={thumbnailUrls}
          width={width}
          height={trackHeight - 4}
          y={2}
          clipColor={clipColor}
          strokeColor={strokeColor}
          isSelected={isSelected}
        />
      ) : isAudio && waveformPoints ? (
        <WaveformBackground
          points={waveformPoints}
          width={width}
          height={trackHeight - 4}
          y={2}
          clipColor={clipColor}
          strokeColor={strokeColor}
          isSelected={isSelected}
        />
      ) : (
      <Rect
        width={width}
        height={trackHeight - 4}
        y={2}
        fill={clipColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
        perfectDrawEnabled={false}
      />
      )}
      
      {/* Left trim handle */}
      <Rect
        x={0}
        y={2}
        width={TRIM_HANDLE_WIDTH}
        height={trackHeight - 4}
        fill={isTrimming === 'left' ? '#1d4ed8' : 'rgba(0,0,0,0.2)'}
        cornerRadius={[2, 0, 0, 2]}
        listening={false}
        perfectDrawEnabled={false}
      />
      
      {/* Right trim handle */}
      <Rect
        x={width - TRIM_HANDLE_WIDTH}
        y={2}
        width={TRIM_HANDLE_WIDTH}
        height={trackHeight - 4}
        fill={isTrimming === 'right' ? '#1d4ed8' : 'rgba(0,0,0,0.2)'}
        cornerRadius={[0, 2, 2, 0]}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Clip label */}
      {width > 60 && (
        <Text
          x={4}
          y={trackHeight / 2 - 8}
          text={isCaption ? (clip.text || 'Caption') : (assetName || `Clip ${clip.id.slice(-4)}`)}
          fontSize={12}
          fill="white"
          width={width - 8}
          ellipsis
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memoization
  return (
    prevProps.clip.id === nextProps.clip.id &&
    prevProps.clip.start === nextProps.clip.start &&
    prevProps.clip.end === nextProps.clip.end &&
    prevProps.clip.inPoint === nextProps.clip.inPoint &&
    prevProps.clip.outPoint === nextProps.clip.outPoint &&
    prevProps.clip.type === nextProps.clip.type &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.zoom === nextProps.zoom &&
    prevProps.trackHeight === nextProps.trackHeight &&
    prevProps.playhead === nextProps.playhead &&
    prevProps.asset?.id === nextProps.asset?.id &&
    prevProps.asset?.metadata?.thumbnails?.length === nextProps.asset?.metadata?.thumbnails?.length &&
    prevProps.asset?.metadata?.waveform?.length === nextProps.asset?.metadata?.waveform?.length
  );
});

// Component for rendering thumbnail background (repeating)
function ThumbnailBackground({
  thumbnailUrls,
  width,
  height,
  y,
  clipColor,
  strokeColor,
  isSelected,
}: {
  thumbnailUrls: string[];
  width: number;
  height: number;
  y: number;
  clipColor: string;
  strokeColor: string;
  isSelected: boolean;
}) {
  const thumbnailWidth = width / thumbnailUrls.length;

  return (
    <>
      <Rect
        width={width}
        height={height}
        y={y}
        fill={clipColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
        perfectDrawEnabled={false}
      />
      {thumbnailUrls.map((url, index) => (
        <ThumbnailImage
          key={index}
          thumbnailUrl={url}
          x={index * thumbnailWidth}
          width={thumbnailWidth}
          height={height}
          y={y}
        />
      ))}
    </>
  );
}

// Individual thumbnail image component
function ThumbnailImage({
  thumbnailUrl,
  x,
  width,
  height,
  y,
}: {
  thumbnailUrl: string;
  x: number;
  width: number;
  height: number;
  y: number;
}) {
  const [image] = useImage(thumbnailUrl);

  if (!image || width < 10) return null;

  return (
    <Image
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      opacity={0.6}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

// Component for rendering waveform background
function WaveformBackground({
  points,
  width,
  height,
  y,
  clipColor,
  strokeColor,
  isSelected,
}: {
  points: number[];
  width: number;
  height: number;
  y: number;
  clipColor: string;
  strokeColor: string;
  isSelected: boolean;
}) {
  return (
    <>
      <Rect
        width={width}
        height={height}
        y={y}
        fill={clipColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={2}
        perfectDrawEnabled={false}
      />
      {/* Render waveform as vertical lines */}
      {points.length >= 4 && (
        <Group y={y + height / 2} listening={false}>
          {Array.from({ length: Math.floor(points.length / 4) }).map((_, i) => {
            const idx = i * 4;
            if (idx + 3 >= points.length) return null;
            const x = points[idx];
            const yTop = points[idx + 1];
            const yBottom = points[idx + 3];
            return (
              <Line
                key={i}
                points={[x, yTop, x, yBottom]}
                stroke="#ffffff"
                strokeWidth={Math.max(1, Math.min(2, width / 100))}
                opacity={0.6}
                listening={false}
                perfectDrawEnabled={false}
              />
            );
          })}
        </Group>
      )}
    </>
  );
}
