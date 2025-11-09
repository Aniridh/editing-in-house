import { useState, useRef, useCallback } from "react";

interface UseExportOptions {
  fps?: number;
  width?: number;
  height?: number;
  maxDurationSec?: number;
  videoBitsPerSecond?: number;
  fileName?: string;
}

export function useExport(
  previewContainerRef: React.RefObject<HTMLDivElement>,
  options: UseExportOptions = {}
) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const exportVideo = useCallback(async () => {
    if (!previewContainerRef.current) return;

    const {
      fps = 30,
      width = 1920,
      height = 1080,
      maxDurationSec = 20,
      videoBitsPerSecond = 2500000,
      fileName = "export.webm",
    } = options;

    try {
      setIsExporting(true);
      setProgress(0);
      chunksRef.current = [];

      const stream = previewContainerRef.current.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setProgress(100);
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, maxDurationSec * 1000);
    } catch (err) {
      console.error("Export error:", err);
      setIsExporting(false);
    }
  }, [previewContainerRef, options]);

  return { exportVideo, isExporting, progress };
}

