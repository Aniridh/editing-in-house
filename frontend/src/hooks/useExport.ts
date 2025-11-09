import { useState, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { ExportSettings } from '../components/Modals/ExportSettingsModal';

const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  fps: 30,
  resolution: '1080p',
  durationLimit: 20,
};

export function useExport(
  videoRef?: React.RefObject<HTMLVideoElement | null>,
  containerRef?: React.RefObject<HTMLDivElement | null>
) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const tracks = useEditorStore((state) => state.tracks);
  const assets = useEditorStore((state) => state.assets);

  const exportWebM = async (settings: ExportSettings = DEFAULT_EXPORT_SETTINGS): Promise<Blob | null> => {
    if (!videoRef?.current) {
      console.error('Video ref not available');
      return null;
    }

    setIsExporting(true);
    setProgress(0);
    chunksRef.current = [];

    try {
      const video = videoRef.current;
      const container = containerRef?.current;

      // Try captureStream on container first (for overlays), then video element
      let stream: MediaStream | null = null;
      
      if (container && (container as any).captureStream) {
        // Capture from container to include overlays (captions, etc.)
        stream = (container as any).captureStream(settings.fps);
      } else if (video.captureStream) {
        stream = video.captureStream(settings.fps);
      } else if ((video as any).mozCaptureStream) {
        stream = (video as any).mozCaptureStream();
      } else {
        // Fallback: use canvas to capture video frames
        console.warn('captureStream not available, using canvas fallback');
        return await exportViaCanvas();
      }

      // Calculate videoBitsPerSecond based on resolution
      // Heuristic: 720p ~2.5Mbps, 1080p ~5Mbps
      const videoBitsPerSecond = settings.resolution === '1080p' ? 5000000 : 2500000;

      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: videoBitsPerSecond,
      };

      // Fallback to VP8 if VP9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm;codecs=vp8';
      }

      // Final fallback
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onprogress = (event) => {
        // Estimate progress based on time
        const duration = Math.min(
          getTimelineDuration(),
          settings.durationLimit
        );
        if (duration > 0) {
          const estimatedProgress = Math.min(100, (event.timecode / duration) * 100);
          setProgress(estimatedProgress);
        }
      };

      mediaRecorder.onstop = () => {
        setProgress(100);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      // Play video to capture
      video.currentTime = 0;
      await video.play();

      // Wait for duration or max export time
      const duration = Math.min(getTimelineDuration(), settings.durationLimit);
      await new Promise((resolve) => setTimeout(resolve, duration * 1000));

      // Stop recording
      mediaRecorder.stop();
      video.pause();

      // Wait for final data
      await new Promise((resolve) => {
        if (mediaRecorder.state === 'inactive') {
          resolve(null);
        } else {
          mediaRecorder.onstop = () => resolve(null);
        }
      });

      // Create blob
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setIsExporting(false);
      return blob;
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      return null;
    }
  };

  const exportViaCanvas = async (): Promise<Blob | null> => {
    // This is a simplified fallback - in a real implementation,
    // you'd render each frame to a canvas and encode it
    console.error('Canvas fallback not fully implemented');
    setIsExporting(false);
    return null;
  };

  const getTimelineDuration = (): number => {
    let maxEnd = 0;
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        maxEnd = Math.max(maxEnd, clip.end);
      });
    });
    return maxEnd;
  };

  const downloadBlob = (blob: Blob, filename: string = 'export.webm') => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    exportWebM,
    isExporting,
    progress,
    downloadBlob,
  };
}
