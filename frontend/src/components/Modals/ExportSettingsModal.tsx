import { useState } from 'react';
import { Button } from '../UI/Button';

export interface ExportSettings {
  fps: 24 | 30 | 60;
  resolution: '720p' | '1080p';
  durationLimit: number; // in seconds
}

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: ExportSettings) => void;
  defaultSettings?: Partial<ExportSettings>;
}

export function ExportSettingsModal({
  isOpen,
  onClose,
  onConfirm,
  defaultSettings = {},
}: ExportSettingsModalProps) {
  const [fps, setFps] = useState<24 | 30 | 60>(defaultSettings.fps || 30);
  const [resolution, setResolution] = useState<'720p' | '1080p'>(defaultSettings.resolution || '1080p');
  const [durationLimit, setDurationLimit] = useState<number>(defaultSettings.durationLimit || 20);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({ fps, resolution, durationLimit });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
        <h2 className="text-xl font-semibold text-white mb-4">Export Settings</h2>

        <div className="space-y-4">
          {/* FPS Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Frame Rate (FPS)
            </label>
            <div className="flex gap-2">
              {([24, 30, 60] as const).map((fpsOption) => (
                <button
                  key={fpsOption}
                  onClick={() => setFps(fpsOption)}
                  className={`flex-1 px-4 py-2 rounded ${
                    fps === fpsOption
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {fpsOption}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resolution
            </label>
            <div className="flex gap-2">
              {(['720p', '1080p'] as const).map((resOption) => (
                <button
                  key={resOption}
                  onClick={() => setResolution(resOption)}
                  className={`flex-1 px-4 py-2 rounded ${
                    resolution === resOption
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {resOption}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration Limit (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={durationLimit}
              onChange={(e) => setDurationLimit(Math.max(1, Math.min(300, parseInt(e.target.value) || 20)))}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="primary" className="flex-1">
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
