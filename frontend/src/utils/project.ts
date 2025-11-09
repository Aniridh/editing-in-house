import type { Asset, Clip, Track, Job } from '../types';

export interface ProjectData {
  version: string;
  assets: Asset[];
  tracks: Track[];
  aspectRatio: string;
  playhead?: number; // Optional: user preference
  zoom?: number; // Optional: user preference
  savedAt: number;
}

const PROJECT_VERSION = '1.0.0';
const LOCALSTORAGE_KEY = 'ainle-autosave';

/**
 * Serialize the current project state to JSON
 * Includes all clip properties: transitions, captions, etc.
 */
export function serializeProject(state: {
  assets: Map<string, Asset>;
  tracks: Track[];
  aspectRatio: string;
  playhead?: number;
  zoom?: number;
}): string {
  const projectData: ProjectData = {
    version: PROJECT_VERSION,
    // Serialize assets (including metadata like thumbnails and waveforms)
    assets: Array.from(state.assets.values()),
    // Serialize tracks with all clip properties (transitions, captions, etc.)
    // Spread operator ensures all properties are included
    tracks: state.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => ({ ...clip })),
    })),
    aspectRatio: state.aspectRatio,
    playhead: state.playhead,
    zoom: state.zoom,
    savedAt: Date.now(),
  };

  return JSON.stringify(projectData, null, 2);
}

/**
 * Load project from JSON string
 */
export function loadProject(json: string): ProjectData {
  try {
    const projectData: ProjectData = JSON.parse(json);
    
    // Validate version (for future compatibility)
    if (!projectData.version) {
      throw new Error('Invalid project file: missing version');
    }

    // Validate required fields
    if (!projectData.assets || !Array.isArray(projectData.assets)) {
      throw new Error('Invalid project file: missing or invalid assets');
    }

    if (!projectData.tracks || !Array.isArray(projectData.tracks)) {
      throw new Error('Invalid project file: missing or invalid tracks');
    }

    if (!projectData.aspectRatio) {
      throw new Error('Invalid project file: missing aspectRatio');
    }

    return projectData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw error;
}

/**
 * Auto-save to localStorage
 */
export function saveToLocalStorage(state: {
  assets: Map<string, Asset>;
  tracks: Track[];
  aspectRatio: string;
  playhead?: number;
  zoom?: number;
}): void {
  try {
    const serialized = serializeProject(state);
    localStorage.setItem(LOCALSTORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * Load from localStorage
 */
export function loadFromLocalStorage(): ProjectData | null {
  try {
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!saved) return null;
    return loadProject(saved);
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Clear localStorage auto-save
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(LOCALSTORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Download project as .ainle.json file
 */
export function downloadProject(json: string, filename: string = 'project.ainle.json'): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read project file from file input
 */
export function readProjectFile(file: File): Promise<ProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const projectData = loadProject(json);
        resolve(projectData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}
