import { useEffect, useRef, useCallback } from 'react';
import type { Clip, Asset } from '../types';

interface AudioSource {
  sourceNode: AudioBufferSourceNode;
  gainNode: GainNode;
  clipId: string;
  startTime: number; // AudioContext time when this should start
  stopTime: number; // AudioContext time when this should stop
}

interface UseAudioEngineProps {
  clips: Clip[];
  assets: Map<string, Asset>;
  playhead: number; // Current timeline position in seconds
  isPlaying: boolean;
  fadeDuration?: number; // Optional fade duration in ms (10-50ms)
}

export function useAudioEngine({
  clips,
  assets,
  playhead,
  isPlaying,
  fadeDuration = 20, // Default 20ms fade
}: UseAudioEngineProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const activeSourcesRef = useRef<AudioSource[]>([]);
  const startTimeRef = useRef<number>(0); // AudioContext time when playback started
  const playheadOffsetRef = useRef<number>(0); // Timeline playhead when playback started

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      // Cleanup on unmount
      stopAllSources();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, []);

  // Load audio buffer from URL
  const loadAudioBuffer = useCallback(async (url: string): Promise<AudioBuffer | null> => {
    // Check cache first
    if (bufferCacheRef.current.has(url)) {
      return bufferCacheRef.current.get(url)!;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = audioContextRef.current;
      if (!audioContext) return null;

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      bufferCacheRef.current.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Error loading audio buffer:', error);
      return null;
    }
  }, []);

  // Stop all active audio sources
  const stopAllSources = useCallback(() => {
    activeSourcesRef.current.forEach((audioSource) => {
      try {
        audioSource.sourceNode.stop();
        audioSource.sourceNode.disconnect();
        audioSource.gainNode.disconnect();
      } catch (error) {
        // Source may have already stopped
      }
    });
    activeSourcesRef.current = [];
  }, []);

  // Schedule audio clip playback
  const scheduleClip = useCallback(
    (
      clip: Clip,
      asset: Asset,
      buffer: AudioBuffer,
      audioContext: AudioContext,
      currentTime: number,
      timelineStart: number
    ) => {
      const clipStartTime = clip.start;
      const clipEndTime = clip.end;
      const clipDuration = clipEndTime - clipStartTime;

      // Calculate offset within the audio buffer
      const bufferStartOffset = clip.inPoint;
      const bufferEndOffset = clip.outPoint;
      const bufferDuration = bufferEndOffset - bufferStartOffset;

      // Determine actual playback duration
      const playbackDuration = Math.min(clipDuration, bufferDuration);

      // Calculate relative position: how far into the clip are we?
      const relativeStart = clipStartTime - timelineStart;
      const relativeEnd = clipEndTime - timelineStart;

      // Only schedule if clip is active or starting soon
      if (relativeEnd > -0.1 && relativeStart < playbackDuration + 0.5) {
        const sourceNode = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        sourceNode.buffer = buffer;
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Calculate when to start in AudioContext time
        const audioContextStartTime = currentTime + Math.max(0, relativeStart);
        const actualStartTime = Math.max(currentTime, audioContextStartTime);
        const actualStopTime = actualStartTime + playbackDuration;

        // Calculate buffer offset and actual playback duration
        let startOffset = bufferStartOffset;
        let actualPlaybackDuration = playbackDuration;
        
        if (relativeStart < 0) {
          // We're already into this clip, offset into the buffer
          const timeIntoClip = Math.abs(relativeStart);
          startOffset = bufferStartOffset + timeIntoClip;
          actualPlaybackDuration = playbackDuration - timeIntoClip;
          
          if (actualPlaybackDuration <= 0) {
            // Clip already ended
            sourceNode.disconnect();
            gainNode.disconnect();
            return;
          }
        }

        // Ensure we don't exceed buffer bounds
        const maxDurationFromOffset = bufferEndOffset - startOffset;
        actualPlaybackDuration = Math.min(actualPlaybackDuration, maxDurationFromOffset);

        if (actualPlaybackDuration <= 0) {
          sourceNode.disconnect();
          gainNode.disconnect();
          return;
        }

        // Recalculate stop time based on actual duration
        const actualStopTime = actualStartTime + actualPlaybackDuration;

        // Check for crossfade transition
        const transitionDuration = clip.transitionDuration || 0;
        const transitionStart = clip.end - transitionDuration;
        const hasTransition = clip.transitionType === 'crossfade' && transitionDuration > 0;

        // Set up fade in/out
        const fadeInSeconds = fadeDuration / 1000;
        const fadeOutSeconds = fadeDuration / 1000;

        // Handle crossfade transition
        if (hasTransition && timelineStart >= transitionStart && timelineStart < clip.end) {
          // Within transition range - crossfade out
          const transitionProgress = (timelineStart - transitionStart) / transitionDuration;
          const fadeOutStart = actualStartTime;
          const fadeOutEnd = actualStopTime;
          
          // Start at full volume, fade out during transition
          gainNode.gain.setValueAtTime(1, fadeOutStart);
          if (actualPlaybackDuration > transitionDuration) {
            gainNode.gain.linearRampToValueAtTime(1 - transitionProgress, fadeOutStart + transitionDuration);
            gainNode.gain.linearRampToValueAtTime(0, fadeOutEnd);
          } else {
            // Clip ends during transition
            gainNode.gain.linearRampToValueAtTime(0, fadeOutEnd);
          }
        } else {
          // Regular fade in/out
          if (fadeDuration > 0) {
            if (relativeStart >= 0 && relativeStart < fadeInSeconds) {
              // Starting at or near clip start - fade in
              gainNode.gain.setValueAtTime(0, actualStartTime);
              gainNode.gain.linearRampToValueAtTime(1, actualStartTime + fadeInSeconds);
            } else if (relativeStart < 0 && Math.abs(relativeStart) < fadeInSeconds) {
              // Already started but within fade window
              const fadeProgress = Math.abs(relativeStart) / fadeInSeconds;
              gainNode.gain.setValueAtTime(fadeProgress, actualStartTime);
              gainNode.gain.linearRampToValueAtTime(1, actualStartTime + fadeInSeconds * (1 - fadeProgress));
            } else {
              // Already past fade in point
              gainNode.gain.setValueAtTime(1, actualStartTime);
            }

            // Fade out at clip end (unless in transition)
            if (!hasTransition && actualPlaybackDuration > fadeOutSeconds) {
              gainNode.gain.linearRampToValueAtTime(1, actualStopTime - fadeOutSeconds);
              gainNode.gain.linearRampToValueAtTime(0, actualStopTime);
            } else if (!hasTransition) {
              // Clip too short for fade out, just fade immediately
              gainNode.gain.linearRampToValueAtTime(0, actualStopTime);
            }
          } else {
            // No fade
            gainNode.gain.setValueAtTime(1, actualStartTime);
          }
        }

        // Start playback
        try {
          sourceNode.start(actualStartTime, startOffset, actualPlaybackDuration);

          // Store reference for cleanup
          activeSourcesRef.current.push({
            sourceNode,
            gainNode,
            clipId: clip.id,
            startTime: actualStartTime,
            stopTime: actualStopTime,
          });

          // Auto-cleanup when source ends
          sourceNode.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(
              (s) => s.clipId !== clip.id
            );
          };
        } catch (error) {
          console.error('Error starting audio source:', error);
          sourceNode.disconnect();
          gainNode.disconnect();
        }
      }
    },
    [fadeDuration]
  );

  // Reschedule all audio clips
  const rescheduleAudio = useCallback(
    async (timelinePlayhead: number, shouldPlay: boolean) => {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      // Resume AudioContext if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Stop all current sources
      stopAllSources();

      if (!shouldPlay) return;

      // Get current AudioContext time
      const currentTime = audioContext.currentTime;

      // Find all audio clips that should be playing or starting soon
      // Include clips that:
      // 1. Are currently active (playhead is within clip)
      // 2. Start within the next 0.5 seconds (for seamless playback)
      const allClipsToSchedule = clips.filter(
        (clip) =>
          clip.assetId &&
          clip.type !== 'caption' &&
          ((timelinePlayhead >= clip.start && timelinePlayhead < clip.end) ||
           (clip.start > timelinePlayhead && clip.start <= timelinePlayhead + 0.5))
      );

      // Also include clips that are transition targets if we're in transition range
      const transitionClips = clips.filter(
        (clip) =>
          clip.transitionType === 'crossfade' &&
          clip.transitionToClipId &&
          clip.transitionDuration
      );
      
      for (const transitionClip of transitionClips) {
        const transitionDuration = transitionClip.transitionDuration || 0;
        const transitionStart = transitionClip.end - transitionDuration;
        if (timelinePlayhead >= transitionStart && timelinePlayhead < transitionClip.end) {
          const targetClip = clips.find((c) => c.id === transitionClip.transitionToClipId);
          if (targetClip && !allClipsToSchedule.includes(targetClip)) {
            allClipsToSchedule.push(targetClip);
          }
        }
      }

      // Load buffers and schedule clips
      for (const clip of allClipsToSchedule) {
        const asset = assets.get(clip.assetId!);
        if (!asset || (asset.type !== 'audio' && asset.type !== 'voiceover')) continue;

        const buffer = await loadAudioBuffer(asset.url);
        if (buffer) {
          // Check if this is a transition target that needs special handling
          const transitionClip = transitionClips.find((tc) => tc.transitionToClipId === clip.id);
          if (transitionClip) {
            const transitionDuration = transitionClip.transitionDuration || 0;
            const transitionStart = transitionClip.end - transitionDuration;
            if (timelinePlayhead >= transitionStart && timelinePlayhead < transitionClip.end) {
              // Schedule with crossfade in
              const transitionProgress = (timelinePlayhead - transitionStart) / transitionDuration;
              const sourceNode = audioContext.createBufferSource();
              const gainNode = audioContext.createGain();
              
              sourceNode.buffer = buffer;
              sourceNode.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              const relativeStart = clip.start - timelinePlayhead;
              const audioContextStartTime = currentTime + Math.max(0, relativeStart);
              const relativeTime = Math.max(0, timelinePlayhead - clip.start);
              const bufferOffset = clip.inPoint + relativeTime;
              const remainingDuration = clip.end - clip.start - relativeTime;
              
              // Crossfade in: start at transition progress, ramp to full volume
              gainNode.gain.setValueAtTime(transitionProgress, audioContextStartTime);
              const fadeInEndTime = audioContextStartTime + (transitionDuration - (timelinePlayhead - transitionStart));
              gainNode.gain.linearRampToValueAtTime(1, fadeInEndTime);
              
              try {
                sourceNode.start(audioContextStartTime, bufferOffset, remainingDuration);
                activeSourcesRef.current.push({
                  sourceNode,
                  gainNode,
                  clipId: clip.id,
                  startTime: audioContextStartTime,
                  stopTime: audioContextStartTime + remainingDuration,
                });
                
                sourceNode.onended = () => {
                  activeSourcesRef.current = activeSourcesRef.current.filter(
                    (s) => s.clipId !== clip.id
                  );
                };
              } catch (error) {
                console.error('Error starting transition audio:', error);
                sourceNode.disconnect();
                gainNode.disconnect();
              }
              continue; // Skip regular scheduling for this clip
            }
          }
          
          // Regular scheduling
          scheduleClip(clip, asset, buffer, audioContext, currentTime, timelinePlayhead);
        }
      }

      // Update timing references
      startTimeRef.current = currentTime;
      playheadOffsetRef.current = timelinePlayhead;
    },
    [clips, assets, loadAudioBuffer, scheduleClip, stopAllSources]
  );

  // Handle play/pause
  useEffect(() => {
    if (isPlaying) {
      rescheduleAudio(playhead, true);
    } else {
      stopAllSources();
    }
  }, [isPlaying, rescheduleAudio, stopAllSources, playhead]);

  // Handle seek (playhead change)
  useEffect(() => {
    if (isPlaying) {
      // When seeking while playing, reschedule from new position
      rescheduleAudio(playhead, true);
    } else {
      // When paused, just stop all sources
      stopAllSources();
    }
  }, [playhead, isPlaying, rescheduleAudio, stopAllSources]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllSources();
    };
  }, [stopAllSources]);

  return {
    stopAll: stopAllSources,
    reschedule: rescheduleAudio,
  };
}
