import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { formatTime } from '../../utils/timeline';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import type { Clip } from '../../types';

interface PreviewProps {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function Preview({ videoRef: externalRef, containerRef: externalContainerRef }: PreviewProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef || internalRef;
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = externalContainerRef || internalContainerRef;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playhead = useEditorStore((state) => state.playhead);
  const setPlayhead = useEditorStore((state) => state.setPlayhead);
  const tracks = useEditorStore((state) => state.tracks);
  const assets = useEditorStore((state) => state.assets);
  const aspectRatio = useEditorStore((state) => state.aspectRatio);

  // Find all video clips that could be active (including transitions)
  const allVideoClips = tracks
    .flatMap((track) => track.clips)
    .filter((clip) => clip.assetId && clip.type !== 'caption');

  // Find clips active at playhead, including transition overlaps
  const activeClips = allVideoClips.filter(
    (clip) => playhead >= clip.start && playhead <= clip.end
  );

  // Check for crossfade transitions
  const transitionClip = activeClips.find(
    (clip) => clip.transitionType === 'crossfade' && clip.transitionToClipId
  );
  const transitionToClip = transitionClip
    ? allVideoClips.find((c) => c.id === transitionClip.transitionToClipId)
    : null;

  // Determine which clips to show and their opacities
  let primaryClip = activeClips[0];
  let primaryOpacity = 1;
  let secondaryClip: Clip | null = null;
  let secondaryOpacity = 0;

  if (transitionClip && transitionToClip) {
    const transitionDuration = transitionClip.transitionDuration || 0.5;
    const transitionStart = transitionClip.end - transitionDuration;
    const transitionEnd = transitionClip.end;

    if (playhead >= transitionStart && playhead <= transitionEnd) {
      // Within transition range
      const progress = (playhead - transitionStart) / transitionDuration;
      primaryClip = transitionClip;
      primaryOpacity = 1 - progress; // Fade out
      secondaryClip = transitionToClip;
      secondaryOpacity = progress; // Fade in
    } else if (playhead > transitionEnd && playhead <= transitionToClip.end) {
      // After transition, show next clip
      primaryClip = transitionToClip;
      primaryOpacity = 1;
    } else {
      // Before transition, show first clip
      primaryClip = transitionClip;
      primaryOpacity = 1;
    }
  }

  const activeAsset = primaryClip ? assets.get(primaryClip.assetId!) : null;
  const secondaryAsset = secondaryClip ? assets.get(secondaryClip.assetId!) : null;

  // Find all active caption clips at the current playhead
  const activeCaptions = tracks
    .flatMap((track) => track.clips)
    .filter((clip) => clip.type === 'caption' && playhead >= clip.start && playhead <= clip.end);

  // Get all audio clips for WebAudio engine
  const allClips = tracks.flatMap((track) => track.clips);
  const audioClips = allClips.filter(
    (clip) => clip.assetId && clip.type !== 'caption'
  );

  // Initialize WebAudio engine
  useAudioEngine({
    clips: audioClips,
    assets,
    playhead,
    isPlaying,
    masterGain: 1,
  });

  // Sync playhead with video element
  useEffect(() => {
    if (videoRef.current && activeAsset && primaryClip) {
      const video = videoRef.current;
      const relativeTime = playhead - primaryClip.start;
      const assetTime = primaryClip.inPoint + relativeTime;

      if (Math.abs(video.currentTime - assetTime) > 0.1) {
        video.currentTime = assetTime;
      }
    }
    
    // Sync secondary video if in transition
    if (secondaryAsset && secondaryClip && secondaryOpacity > 0) {
      const secondaryVideo = document.querySelector(
        `video[src="${secondaryAsset.url}"]`
      ) as HTMLVideoElement;
      if (secondaryVideo) {
        const relativeTime = playhead - secondaryClip.start;
        const assetTime = relativeTime + secondaryClip.inPoint;
        if (Math.abs(secondaryVideo.currentTime - assetTime) > 0.1) {
          secondaryVideo.currentTime = assetTime;
        }
      }
    }
  }, [playhead, activeAsset, primaryClip, secondaryAsset, secondaryClip, secondaryOpacity]);

  // Update video source when active asset changes
  useEffect(() => {
    if (videoRef.current && activeAsset) {
      const video = videoRef.current;
      if (video.src !== activeAsset.url) {
        video.src = activeAsset.url;
        video.load();
      }
    } else if (videoRef.current && !activeAsset) {
      videoRef.current.src = '';
    }
  }, [activeAsset, secondaryAsset]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    setPlayhead(time);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    
    if (primaryClip) {
      const timelineTime = primaryClip.start + (time - primaryClip.inPoint);
      setPlayhead(timelineTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  // Calculate aspect ratio for container
  const [width, height] = aspectRatio.split(':').map(Number);
  const aspectRatioValue = width / height;


  return (
    <div className="flex flex-col h-full bg-black">
      <div
        ref={previewContainerRef}
        className="flex-1 flex items-center justify-center relative"
        style={{ aspectRatio: aspectRatioValue }}
      >
        {activeAsset ? (
          <>
            {/* Primary video (fading out during transition) */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain absolute inset-0"
              src={activeAsset.url}
              style={{ opacity: primaryOpacity }}
              crossOrigin="anonymous"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              playsInline
              aria-label="Video preview"
            />
            {/* Secondary video (fading in during transition) */}
            {secondaryAsset && secondaryOpacity > 0 && (
              <video
                key={secondaryAsset.id}
                className="w-full h-full object-contain absolute inset-0"
                src={secondaryAsset.url}
                style={{ opacity: secondaryOpacity }}
                crossOrigin="anonymous"
                onLoadedMetadata={() => {
                  const video = document.querySelector(
                    `video[src="${secondaryAsset.url}"]`
                  ) as HTMLVideoElement;
                  if (video && secondaryClip) {
                    const relativeTime = playhead - secondaryClip.start;
                    video.currentTime = Math.max(0, relativeTime + secondaryClip.inPoint);
                  }
                }}
                playsInline
              />
            )}
            {/* Caption Overlay Layer */}
            <div className="absolute inset-0 pointer-events-none">
              {activeCaptions.map((c) => {
                const t = (playhead - c.start) * 1000; // ms since clip start
                const fadeIn = c.fadeInMs ?? 0;
                const fadeOut = c.fadeOutMs ?? 0;
                const totalMs = (c.end - c.start) * 1000;
                const inAlpha = fadeIn ? Math.min(1, t / fadeIn) : 1;
                const outAlpha = fadeOut ? Math.min(1, (totalMs - t) / fadeOut) : 1;
                const alpha = (c.opacity ?? 1) * Math.min(inAlpha, outAlpha);

                // Get container dimensions for normalized positioning
                const container = previewContainerRef.current;
                const previewWidth = container?.clientWidth || 1920;
                const previewHeight = container?.clientHeight || 1080;

                const left = (c.x ?? 0.5) * previewWidth;
                const top = (c.y ?? 0.8) * previewHeight;

                const align = c.align ?? "center";
                const transform = align === "center" ? "translate(-50%, -50%)"
                                : align === "right" ? "translate(-100%, -50%)" : "translate(0, -50%)";

                return (
                  <div
                    key={c.id}
                    style={{
                      position: "absolute",
                      left, top,
                      transform,
                      color: c.color ?? "#fff",
                      fontSize: (c.fontSize ?? 48) + "px",
                      opacity: alpha,
                      padding: c.bg ? "4px 8px" : undefined,
                      background: c.bg ?? undefined,
                      borderRadius: 8,
                      pointerEvents: "none",
                      whiteSpace: "pre-wrap",
                      textAlign: align as any,
                    }}
                  >
                    {c.text}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-center">
            <p className="text-lg">No clip at playhead</p>
            <p className="text-sm mt-2">Add clips to the timeline to preview</p>
          </div>
        )}
      </div>

      <div className="bg-gray-900 p-4 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-gray-300 tabular-nums">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              step="0.1"
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              aria-label="Seek timeline"
            />
            <span className="text-sm text-gray-300 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>

          <div className="text-sm text-gray-400">
            {formatTime(playhead)}
          </div>
        </div>
      </div>
    </div>
  );
}
