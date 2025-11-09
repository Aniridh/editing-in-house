import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useExport } from "../../hooks/useExport";
import { Button } from "../UI/Button";

export interface ExportSettings {
  fps: 24 | 30 | 60;
  resolution: '720p' | '1080p';
  durationLimit: number; // in seconds
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  // Ref to the element you capture (e.g., preview container)
  captureRef: React.RefObject<HTMLElement | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  defaultSettings?: {
    fps?: 24 | 30 | 60;
    resolution?: '720p' | '1080p';
    durationLimit?: number;
  };
};

const PRESETS = [
  { label: "720p (1280×720)", w: 1280, h: 720 },
  { label: "1080p (1920×1080)", w: 1920, h: 1080 },
];

export function ExportSettingsModal({ isOpen, onClose, captureRef, videoRef, defaultSettings }: Props) {
  const { exportWebM, downloadBlob } = useExport(videoRef, captureRef);
  const [fps, setFps] = useState<24 | 30 | 60>(defaultSettings?.fps || 30);
  const [presetIdx, setPresetIdx] = useState(0);
  const [maxDurationSec, setMaxDurationSec] = useState(defaultSettings?.durationLimit || 20);
  const { w, h } = PRESETS[presetIdx];

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const doExport = async () => {
    if (!captureRef.current) return;
    
    const blob = await exportWebM({
      fps,
      resolution: presetIdx === 0 ? '720p' : '1080p',
      durationLimit: maxDurationSec,
    });
    
    if (blob) {
      downloadBlob(blob, `export_${w}x${h}_${fps}fps.webm`);
    }
    
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[420px] rounded-2xl bg-gray-800 p-5 shadow-xl">
        <h3 className="text-lg font-semibold mb-3 text-white">Export Settings</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">FPS</label>
            <select className="border border-gray-700 bg-gray-700 text-white rounded px-2 py-1"
              value={fps} onChange={(e) => setFps(Number(e.target.value) as 24 | 30 | 60)}>
              <option value={24}>24</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Resolution</label>
            <select className="border border-gray-700 bg-gray-700 text-white rounded px-2 py-1"
              value={presetIdx} onChange={(e) => setPresetIdx(Number(e.target.value))}>
              {PRESETS.map((p, i) => (
                <option key={p.label} value={i}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Max Duration (s)</label>
            <input className="border border-gray-700 bg-gray-700 text-white rounded px-2 py-1 w-24" type="number" min={1} max={120}
              value={maxDurationSec} onChange={(e) => setMaxDurationSec(Number(e.target.value))} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={doExport} variant="primary">Export</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export type { Props as ExportSettingsModalProps };