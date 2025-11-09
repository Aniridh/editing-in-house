import { useState, useRef, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandPanel } from './components/Panels/CommandPanel';
import { GeneratorPanel } from './components/Panels/GeneratorPanel';
import { AssetBin } from './components/Panels/AssetBin';
import CaptionEditor from './components/Panels/CaptionEditor';
import { Preview } from './components/Editor/Preview';
import { Timeline } from './components/Editor/Timeline';
import { StatusBar } from './components/StatusBar';
import { ToastContainer, type Toast } from './components/UI/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useExport } from './hooks/useExport';
import { useProjectSaveLoad } from './hooks/useProjectSaveLoad';
import { useCommandPalette } from './hooks/useCommandPalette';
import { loadFromLocalStorage } from './utils/project';
import { Button } from './components/UI/Button';
import { useEditorStore } from './store/editorStore';
import { ExportSettingsModal, type ExportSettings } from './components/Modals/ExportSettingsModal';
import { CommandPalette } from './components/CommandPalette';
import { HelpOverlay } from './components/Modals/HelpOverlay';

function App() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings] = useState<ExportSettings | null>(null);
  const selection = useEditorStore((state) => state.selection);
  const tracks = useEditorStore((state) => state.tracks);

  useKeyboardShortcuts();

  // Find selected caption clip
  const selectedCaptionClip = selection.length === 1
    ? tracks
        .flatMap((track) => track.clips)
        .find((clip) => clip.id === selection[0] && clip.type === 'caption')
    : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const { isExporting, progress } = useExport(videoRef, previewContainerRef);
  const { saveProject, loadProject } = useProjectSaveLoad();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandPalette = useCommandPalette();
  const [showHelp, setShowHelp] = useState(false);

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  // Export is now handled directly in ExportSettingsModal

  const handleSaveProject = () => {
    try {
      saveProject();
      addToast('Project saved!', 'success');
    } catch (error) {
      console.error('Save error:', error);
      addToast('Failed to save project', 'error');
    }
  };

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await loadProject(file);
      addToast('Project loaded!', 'success');
    } catch (error) {
      console.error('Load error:', error);
      addToast(error instanceof Error ? error.message : 'Failed to load project', 'error');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const loadProjectFromStore = useEditorStore((state) => state.loadProject);

  // Toggle help overlay with ? key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?') {
        if (!e.target || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        setShowHelp((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load from localStorage on mount (only once)
  useEffect(() => {
    const saved = loadFromLocalStorage();
    if (saved) {
      // Ask user if they want to restore
      const shouldRestore = window.confirm(
        'Found an auto-saved project. Would you like to restore it?'
      );
      if (shouldRestore) {
        try {
          loadProjectFromStore(saved);
          addToast('Auto-saved project restored', 'success');
        } catch (error) {
          console.error('Failed to restore auto-save:', error);
          addToast('Failed to restore auto-save', 'error');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
        {/* Top bar */}
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
          <h1 className="text-lg font-semibold">AI NLE</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Demo Mode</span>
            </label>
            <Button
              onClick={handleSaveProject}
              variant="secondary"
              className="text-sm"
            >
              Save Project
            </Button>
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ainle.json,application/json"
                onChange={handleLoadProject}
                className="hidden"
                aria-label="Load project"
              />
              <Button
                as="span"
                variant="secondary"
                className="text-sm"
              >
                Load Project
              </Button>
            </label>
            <Button
              onClick={handleExportClick}
              disabled={isExporting}
              variant="primary"
              className="text-sm"
            >
              {isExporting ? `Exporting... ${Math.round(progress)}%` : 'Export'}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panels */}
          <div className="w-80 flex flex-col border-r border-gray-700">
            <div className="flex-1 overflow-hidden">
              <CommandPanel />
            </div>
            <div className="h-80 border-t border-gray-700 overflow-hidden">
              <GeneratorPanel />
            </div>
            <div className="h-80 border-t border-gray-700 overflow-hidden">
        <AssetBin />
            </div>
            {selectedCaptionClip && (
              <div className="h-96 border-t border-gray-700 overflow-hidden">
                <CaptionEditor />
              </div>
            )}
          </div>

          {/* Editor area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <Preview videoRef={videoRef} containerRef={previewContainerRef} />
            </div>
            <div className="h-64 border-t border-gray-700 overflow-hidden">
              <Timeline />
            </div>
          </div>
        </div>

        {/* Status bar */}
        <StatusBar />
      </div>

        {/* Toasts */}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />

        {/* Export Settings Modal */}
        <ExportSettingsModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          captureRef={previewContainerRef}
          videoRef={videoRef}
          defaultSettings={exportSettings || undefined}
        />

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPalette.isOpen}
          onClose={commandPalette.close}
        />

        {/* Help Overlay */}
        <HelpOverlay
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
        />
      </ErrorBoundary>
  );
}

export default App;