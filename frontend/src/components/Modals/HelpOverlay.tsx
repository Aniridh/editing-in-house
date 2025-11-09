import { useEffect } from 'react';
import { Button } from '../UI/Button';

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts & Help</h2>
            <Button onClick={onClose} variant="secondary" className="text-sm">
              Close (Esc)
            </Button>
          </div>

          <div className="space-y-6">
            {/* Editing Shortcuts */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Editing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem keys={['U']} description="Undo" />
                <ShortcutItem keys={['Shift', 'U']} description="Redo" />
                <ShortcutItem keys={['Delete', 'Backspace']} description="Delete selected clips" />
                <ShortcutItem keys={['Shift', 'S']} description="Split all selected clips at playhead" />
                <ShortcutItem keys={['R']} description="Toggle Ripple mode" />
                <ShortcutItem keys={['Ctrl', 'K']} description="Open Command Palette" />
                <ShortcutItem keys={['Shift', 'Click']} description="Multi-select clips" />
                <ShortcutItem keys={['Drag']} description="Marquee selection" />
              </div>
            </section>

            {/* Timeline Controls */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Timeline Controls</h3>
              <div className="space-y-2 text-gray-300">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-sm bg-gray-700 px-2 py-1 rounded">Ripple Mode</span>
                  <span className="text-sm">When ON, moving/trimming clips shifts downstream clips to maintain timeline continuity</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-sm bg-gray-700 px-2 py-1 rounded">Snap</span>
                  <span className="text-sm">Clips automatically snap to playhead, clip boundaries, and 0.1s grid when within 4px</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-sm bg-gray-700 px-2 py-1 rounded">Marquee</span>
                  <span className="text-sm">Click and drag on empty timeline area to select multiple clips</span>
                </div>
              </div>
            </section>

            {/* Export Tips */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Export Tips</h3>
              <ul className="space-y-2 text-gray-300 text-sm list-disc list-inside">
                <li>Click "Export" button to configure FPS (24/30/60) and resolution (720p/1080p)</li>
                <li>Export duration is limited to prevent browser memory issues (default 20s)</li>
                <li>Captions and overlays are included in the exported video</li>
                <li>For best results, ensure video assets have CORS headers enabled</li>
              </ul>
            </section>

            {/* Project Management */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">Project Management</h3>
              <ul className="space-y-2 text-gray-300 text-sm list-disc list-inside">
                <li>Use "Save Project" to download your project as a .ainle.json file</li>
                <li>Projects auto-save to browser localStorage every 10 seconds</li>
                <li>Load saved projects using "Load Project" button</li>
                <li>Project files include all assets, clips, transitions, and settings</li>
              </ul>
            </section>

            {/* Demo Documentation */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">How to Demo</h3>
              <p className="text-gray-300 text-sm mb-3">
                For a complete guide on demonstrating this editor, see the documentation:
              </p>
              <a
                href="https://github.com/your-org/editing-in-house/blob/main/README.md#how-to-demo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline text-sm"
              >
                View Demo Guide →
              </a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutItem({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {keys.map((key, index) => (
          <span key={index} className="font-mono text-xs bg-gray-700 px-2 py-1 rounded">
            {key}
          </span>
        ))}
      </div>
      <span className="text-sm text-gray-300">{description}</span>
    </div>
  );
}
