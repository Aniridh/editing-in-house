import { create } from 'zustand';
import type { Asset, Clip, Track, Job } from '../types.js';

interface EditorState {
  assets: Map<string, Asset>;
  tracks: Track[];
  playhead: number; // current position in seconds
  zoom: number; // pixels per second
  selection: string[]; // selected clip IDs (transient - not in history)
  jobs: Map<string, Job>;
  aspectRatio: string; // e.g., "16:9", "9:16"
}

// History state (excludes transient fields like selection, playhead, zoom)
interface HistoryState {
  assets: Map<string, Asset>;
  tracks: Track[];
  jobs: Map<string, Job>;
  aspectRatio: string;
}

interface EditorStore extends EditorState {
  // Actions
  insertClip: (clip: Clip) => void;
  trimClip: (clipId: string, inPoint?: number, outPoint?: number, ripple?: boolean) => void;
  splitClip: (clipId: string, position: number) => void;
  moveClip: (clipId: string, trackId: string, position: number, ripple?: boolean) => void;
  deleteClip: (clipId: string, ripple?: boolean) => void;
  setPlayhead: (position: number) => void;
  setZoom: (zoom: number) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  updateJob: (job: Job) => void;
  removeJob: (jobId: string) => void;
  setSelection: (clipIds: string[]) => void;
  clearSelection: () => void;
  setAspectRatio: (aspectRatio: string) => void;
  // Caption operations
  updateCaption: (clipId: string, captionProps: Partial<Pick<Clip, 'text' | 'x' | 'y' | 'fontSize' | 'align' | 'color' | 'bg' | 'opacity' | 'fadeInMs' | 'fadeOutMs'>>) => void;
  // Transition operations
  setTransition: (fromClipId: string, toClipId: string, duration: number) => void;
  removeTransition: (clipId: string) => void;
  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // Project operations
  loadProject: (projectData: { assets: Asset[]; tracks: Track[]; aspectRatio: string; playhead?: number; zoom?: number }) => void;
}

const createInitialState = (): EditorState => ({
  assets: new Map(),
  tracks: [
    { id: 'track-video-1', type: 'video', clips: [] },
    { id: 'track-audio-1', type: 'audio', clips: [] },
    { id: 'track-overlay-1', type: 'overlay', clips: [] },
  ],
  playhead: 0,
  zoom: 100, // pixels per second
  selection: [],
  jobs: new Map(),
  aspectRatio: '16:9',
});

// History management
class HistoryManager {
  private past: HistoryState[] = [];
  private future: HistoryState[] = [];
  private readonly maxHistorySize = 50;

  // Serialize state to history (exclude transient fields)
  private serialize(state: EditorState): HistoryState {
    return {
      assets: new Map(state.assets),
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => ({ ...clip })),
      })),
      jobs: new Map(state.jobs),
      aspectRatio: state.aspectRatio,
    };
  }

  // Deep clone history state
  private cloneHistoryState(state: HistoryState): HistoryState {
    return {
      assets: new Map(state.assets),
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => ({ ...clip })),
      })),
      jobs: new Map(state.jobs),
      aspectRatio: state.aspectRatio,
    };
  }

  // Save current state to history
  save(state: EditorState): void {
    this.past.push(this.serialize(state));
    this.future = []; // Clear redo stack on new action
    if (this.past.length > this.maxHistorySize) {
      this.past.shift();
    }
  }

  // Undo: move current state to future, return previous state
  undo(currentState: EditorState): HistoryState | null {
    if (this.past.length === 0) return null;
    this.future.unshift(this.serialize(currentState));
    return this.cloneHistoryState(this.past.pop()!);
  }

  // Redo: move current state to past, return next state
  redo(currentState: EditorState): HistoryState | null {
    if (this.future.length === 0) return null;
    this.past.push(this.serialize(currentState));
    return this.cloneHistoryState(this.future.shift()!);
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}

const history = new HistoryManager();

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...createInitialState(),

  insertClip: (clip) => {
    set((state) => {
      const newTracks = state.tracks.map((track) => {
        if (track.id === clip.trackId) {
          return {
            ...track,
            clips: [...track.clips, clip].sort((a, b) => a.start - b.start),
          };
        }
        return track;
      });
      const newState = { ...state, tracks: newTracks };
      history.save(newState);
      return { tracks: newTracks };
    });
  },

  trimClip: (clipId, inPoint, outPoint, ripple = false) => {
    set((state) => {
      const clip = state.tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === clipId);
      if (!clip) return state;

      const oldDuration = clip.end - clip.start;
      const newInPoint = inPoint !== undefined ? inPoint : clip.inPoint;
      const newOutPoint = outPoint !== undefined ? outPoint : clip.outPoint;
      const newDuration = newOutPoint - newInPoint;
      const durationDelta = newDuration - oldDuration;

      const newTracks = state.tracks.map((track) => {
        if (track.id !== clip.trackId) return track;

        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        const clipIndex = sortedClips.findIndex((c) => c.id === clipId);

        return {
          ...track,
          clips: sortedClips.map((c, idx) => {
            if (c.id === clipId) {
              // Update trimmed clip
              const newEnd = c.start + newDuration;
              return {
                ...c,
                inPoint: newInPoint,
                outPoint: newOutPoint,
                end: newEnd,
              };
            } else if (ripple && idx > clipIndex) {
              // Ripple: shift downstream clips
              return {
                ...c,
                start: c.start + durationDelta,
                end: c.end + durationDelta,
              };
            }
            return c;
          }),
        };
      });

      const newState = { ...state, tracks: newTracks };
      history.save(newState);
      return { tracks: newTracks };
    });
  },

  splitClip: (clipId, position) => {
    set((state) => {
      const newTracks = state.tracks.map((track) => {
        const clipIndex = track.clips.findIndex((c) => c.id === clipId);
        if (clipIndex === -1) return track;

        const clip = track.clips[clipIndex];
        const asset = state.assets.get(clip.assetId);
        if (!asset) return track;

        // Calculate relative position within clip
        const clipDuration = clip.outPoint - clip.inPoint;
        const relativePosition = (position - clip.start) / clipDuration;
        const splitPoint = clip.inPoint + (clip.outPoint - clip.inPoint) * relativePosition;

        // Create two clips
        const firstClip: Clip = {
          ...clip,
          end: position,
          outPoint: splitPoint,
        };

        const secondClip: Clip = {
          ...clip,
          id: `${clip.id}-split-${Date.now()}`,
          start: position,
          inPoint: splitPoint,
        };

        const newClips = [...track.clips];
        newClips[clipIndex] = firstClip;
        newClips.splice(clipIndex + 1, 0, secondClip);

        return {
          ...track,
          clips: newClips,
        };
      });
      const newState = { ...state, tracks: newTracks };
      history.save(newState);
      return { tracks: newTracks };
    });
  },

  moveClip: (clipId, trackId, position, ripple = false) => {
    set((state) => {
      const clip = state.tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === clipId);
      if (!clip) return state;

      const duration = clip.end - clip.start;
      const newStart = Math.max(0, position);
      const newEnd = newStart + duration;
      const oldStart = clip.start;
      const positionDelta = newStart - oldStart;

      // Remove from old track
      const newTracks = state.tracks.map((track) => {
        if (track.id === clip.trackId) {
          if (ripple && track.id === trackId) {
            // Ripple move: shift downstream clips
            const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
            const clipIndex = sortedClips.findIndex((c) => c.id === clipId);
            
            return {
              ...track,
              clips: sortedClips.map((c, idx) => {
                if (c.id === clipId) {
                  return {
                    ...c,
                    trackId,
                    start: newStart,
                    end: newEnd,
                  };
                } else if (idx > clipIndex && c.start >= clip.end) {
                  // Shift downstream clips
                  return {
                    ...c,
                    start: c.start + positionDelta,
                    end: c.end + positionDelta,
                  };
                }
                return c;
              }),
            };
          } else {
            // Regular move: just remove from old track
            return {
              ...track,
              clips: track.clips.filter((c) => c.id !== clipId),
            };
          }
        }
        return track;
      });

      // Add to new track (if different track or not ripple)
      const updatedTracks = newTracks.map((track) => {
        if (track.id === trackId) {
          if (ripple && track.id === clip.trackId) {
            // Already handled above
            return track;
          }
          const movedClip: Clip = {
            ...clip,
            trackId,
            start: newStart,
            end: newEnd,
          };
          return {
            ...track,
            clips: [...track.clips, movedClip].sort((a, b) => a.start - b.start),
          };
        }
        return track;
      });

      const newState = { ...state, tracks: updatedTracks };
      history.save(newState);
      return { tracks: updatedTracks };
    });
  },

  deleteClip: (clipId, ripple = true) => {
    set((state) => {
      const clip = state.tracks
        .flatMap((t) => t.clips)
        .find((c) => c.id === clipId);
      if (!clip) return state;

      const clipDuration = clip.end - clip.start;

      const newTracks = state.tracks.map((track) => {
        if (track.id !== clip.trackId) {
          return track;
        }

        const sortedClips = [...track.clips].sort((a, b) => a.start - b.start);
        const clipIndex = sortedClips.findIndex((c) => c.id === clipId);

        if (ripple) {
          // Ripple delete: close gap by shifting downstream clips
          return {
            ...track,
            clips: sortedClips
              .filter((c) => c.id !== clipId)
              .map((c, idx) => {
                const originalIndex = sortedClips.findIndex((orig) => orig.id === c.id);
                if (originalIndex > clipIndex) {
                  // Shift downstream clips left
                  return {
                    ...c,
                    start: c.start - clipDuration,
                    end: c.end - clipDuration,
                  };
                }
                return c;
              }),
          };
        } else {
          // Regular delete: just remove clip (leaves gap)
          return {
            ...track,
            clips: track.clips.filter((c) => c.id !== clipId),
          };
        }
      });

      const newState = { ...state, tracks: newTracks };
      history.save(newState);
      return { tracks: newTracks };
    });
  },

  setPlayhead: (position) => {
    set({ playhead: Math.max(0, position) });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(10, Math.min(1000, zoom)) });
  },

  addAsset: (asset) => {
    set((state) => {
      const newAssets = new Map(state.assets);
      newAssets.set(asset.id, asset);
      return { assets: newAssets };
    });

    // Generate thumbnails/waveforms asynchronously
    if (asset.type === 'video' && !asset.metadata?.thumbnails) {
      import('../utils/thumbnails').then(({ generateVideoThumbnails }) => {
        generateVideoThumbnails(asset.url, 10)
          .then((thumbnails) => {
            const updatedAsset = useEditorStore.getState().assets.get(asset.id);
            if (updatedAsset) {
              useEditorStore.getState().addAsset({
                ...updatedAsset,
                metadata: {
                  ...updatedAsset.metadata,
                  thumbnails,
                },
              });
            }
          })
          .catch((error) => {
            console.error('Error generating thumbnails:', error);
          });
      });
    } else if ((asset.type === 'audio' || asset.type === 'voiceover') && !asset.metadata?.waveform) {
      import('../utils/thumbnails').then(({ generateAudioWaveform }) => {
        generateAudioWaveform(asset.url, 200)
          .then((waveform) => {
            const updatedAsset = useEditorStore.getState().assets.get(asset.id);
            if (updatedAsset) {
              useEditorStore.getState().addAsset({
                ...updatedAsset,
                metadata: {
                  ...updatedAsset.metadata,
                  waveform,
                },
              });
            }
          })
          .catch((error) => {
            console.error('Error generating waveform:', error);
          });
      });
    }
  },

  removeAsset: (assetId) => {
    set((state) => {
      const newAssets = new Map(state.assets);
      newAssets.delete(assetId);
      return { assets: newAssets };
    });
  },

  updateJob: (job) => {
    set((state) => {
      const newJobs = new Map(state.jobs);
      newJobs.set(job.id, job);
      return { jobs: newJobs };
    });
  },

  removeJob: (jobId) => {
    set((state) => {
      const newJobs = new Map(state.jobs);
      newJobs.delete(jobId);
      return { jobs: newJobs };
    });
  },

  setSelection: (clipIds) => {
    set({ selection: clipIds });
  },

  clearSelection: () => {
    set({ selection: [] });
  },

  setAspectRatio: (aspectRatio) => {
    set({ aspectRatio });
  },

  updateCaption: (clipId, captionProps) => {
    set((state) => {
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            return {
              ...clip,
              ...captionProps,
            };
          }
          return clip;
        }),
      }));
      const newState = { ...state, tracks: newTracks };
      history.save(newState);
      return { tracks: newTracks };
    });
  },

  setTransition: (fromClipId, toClipId, duration) => {
    set((state) => {
      const clampedDuration = Math.max(0.25, Math.min(1.5, duration));
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === fromClipId) {
            return {
              ...clip,
              transitionType: 'crossfade',
              transitionDuration: clampedDuration,
              transitionToClipId: toClipId,
            };
          }
          // Remove any transitions pointing to fromClipId
          if (clip.transitionToClipId === fromClipId) {
            const { transitionType, transitionDuration, transitionToClipId, ...rest } = clip;
            return rest;
          }
          return clip;
        }),
      }));
      const newState = { ...state, tracks: newTracks };
      history.save(newState);
      return { tracks: newTracks };
    });
  },

  removeTransition: (clipId) => {
    set((state) => {
      const newTracks = state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            const { transitionType, transitionDuration, transitionToClipId, ...rest } = clip;
            return rest;
          }
          return clip;
        }),
      }));
      const newState = { ...state, tracks: newTracks };
      history.save(newState);
      return { tracks: newTracks };
    });
  },

  undo: () => {
    const currentState = get();
    const previousState = history.undo(currentState);
    if (previousState) {
      // Restore state, preserving playhead and zoom (but clearing selection as transient)
      set((state) => ({
        ...state,
        assets: previousState.assets,
        tracks: previousState.tracks,
        jobs: previousState.jobs,
        aspectRatio: previousState.aspectRatio,
        selection: [], // Clear selection on undo
      }));
    }
  },

  redo: () => {
    const currentState = get();
    const nextState = history.redo(currentState);
    if (nextState) {
      // Restore state, preserving playhead and zoom (but clearing selection as transient)
      set((state) => ({
        ...state,
        assets: nextState.assets,
        tracks: nextState.tracks,
        jobs: nextState.jobs,
        aspectRatio: nextState.aspectRatio,
        selection: [], // Clear selection on redo
      }));
    }
  },

  canUndo: () => history.canUndo(),
  canRedo: () => history.canRedo(),

  loadProject: (projectData) => {
    set((state) => {
      // Convert assets array to Map
      const assetsMap = new Map<string, Asset>();
      projectData.assets.forEach((asset) => {
        assetsMap.set(asset.id, asset);
      });

      // Restore state
      const newState = {
        ...state,
        assets: assetsMap,
        tracks: projectData.tracks,
        aspectRatio: projectData.aspectRatio,
        playhead: projectData.playhead !== undefined ? projectData.playhead : state.playhead,
        zoom: projectData.zoom !== undefined ? projectData.zoom : state.zoom,
        selection: [], // Clear selection on load
      };

      // Clear history when loading a new project
      history.clear();
      history.save(newState);

      return newState;
    });
  },
}));
