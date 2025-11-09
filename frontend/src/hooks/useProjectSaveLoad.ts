import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import {
  serializeProject,
  downloadProject,
  readProjectFile,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
} from '../utils/project';

const AUTOSAVE_INTERVAL = 10000; // 10 seconds

export function useProjectSaveLoad() {
  const assets = useEditorStore((state) => state.assets);
  const tracks = useEditorStore((state) => state.tracks);
  const aspectRatio = useEditorStore((state) => state.aspectRatio);
  const playhead = useEditorStore((state) => state.playhead);
  const zoom = useEditorStore((state) => state.zoom);
  const loadProject = useEditorStore((state) => state.loadProject);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save to localStorage every 10 seconds
  useEffect(() => {
    const performAutosave = () => {
      saveToLocalStorage({
        assets,
        tracks,
        aspectRatio,
        playhead,
        zoom,
      });
    };

    // Initial save
    performAutosave();

    // Set up interval
    autosaveTimerRef.current = setInterval(performAutosave, AUTOSAVE_INTERVAL);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
  }, [assets, tracks, aspectRatio, playhead, zoom]);

  const handleSaveProject = () => {
    const json = serializeProject({
      assets,
      tracks,
      aspectRatio,
      playhead,
      zoom,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `project-${timestamp}.ainle.json`;
    downloadProject(json, filename);
  };

  const handleLoadProject = async (file: File) => {
    try {
      const projectData = await readProjectFile(file);
      loadProject(projectData);
      return true;
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  };

  const handleLoadFromLocalStorage = () => {
    const projectData = loadFromLocalStorage();
    if (projectData) {
      loadProject(projectData);
      return true;
    }
    return false;
  };

  const handleClearAutosave = () => {
    clearLocalStorage();
  };

  return {
    saveProject: handleSaveProject,
    loadProject: handleLoadProject,
    loadFromLocalStorage: handleLoadFromLocalStorage,
    clearAutosave: handleClearAutosave,
  };
}
