import { create } from "zustand";
import type { Asset, Clip, Job } from "../types";

interface EditorState {
  assets: Asset[];
  clips: Clip[];
  playhead: number;
  duration: number;
  zoom: number;
  selection?: { clipId?: string };
  jobs: Record<string, Job>;
}

interface EditorActions {
  pushAsset: (asset: Asset) => void;
  insertClip: (clip: Clip) => void;
  moveClip: (id: string, start: number) => void;
  trimClip: (id: string, opts: { start?: number; end?: number }) => void;
  splitClip: (id: string, atSec: number) => void;
  deleteClip: (id: string) => void;
  selectClip: (id?: string) => void;
  setPlayhead: (sec: number) => void;
  setZoom: (z: number) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  updateJob: (job: Job) => void;
}

const snap = (t: number) => Math.round(t * 10) / 10;

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  assets: [],
  clips: [],
  playhead: 0,
  duration: 0,
  zoom: 100,
  selection: undefined,
  jobs: {},

  pushAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets, asset],
    })),

  insertClip: (clip) =>
    set((state) => ({
      clips: [...state.clips, { ...clip, start: snap(clip.start), end: snap(clip.end) }].sort(
        (a, b) => a.start - b.start
      ),
    })),

  moveClip: (id, start) =>
    set((state) => {
      const clip = state.clips.find((c) => c.id === id);
      if (!clip) return state;
      const delta = snap(start) - clip.start;
      return {
        clips: state.clips.map((c) =>
          c.id === id ? { ...c, start: snap(start), end: snap(c.end + delta) } : c
        ),
      };
    }),

  trimClip: (id, opts) =>
    set((state) => ({
      clips: state.clips.map((c) => {
        if (c.id !== id) return c;
        const start = opts.start !== undefined ? snap(opts.start) : c.start;
        const end = opts.end !== undefined ? snap(opts.end) : c.end;
        return { ...c, start, end };
      }),
    })),

  splitClip: (id, atSec) =>
    set((state) => {
      const clip = state.clips.find((c) => c.id === id);
      if (!clip) return state;
      const splitAt = snap(atSec);
      if (splitAt <= clip.start || splitAt >= clip.end) return state;
      const left = { ...clip, end: splitAt };
      const right = {
        ...clip,
        id: `${clip.id}-split-${Date.now()}`,
        start: splitAt,
      };
      return {
        clips: [...state.clips.filter((c) => c.id !== id), left, right].sort(
          (a, b) => a.start - b.start
        ),
      };
    }),

  deleteClip: (id) =>
    set((state) => ({
      clips: state.clips.filter((c) => c.id !== id),
      selection: state.selection?.clipId === id ? undefined : state.selection,
    })),

  selectClip: (id) =>
    set({ selection: id ? { clipId: id } : undefined }),

  setPlayhead: (sec) =>
    set({ playhead: Math.max(0, Math.min(sec, useEditorStore.getState().duration)) }),

  setZoom: (z) =>
    set({ zoom: Math.max(10, Math.min(1000, z)) }),

  updateClip: (id, patch) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  updateJob: (job) =>
    set((state) => ({
      jobs: { ...state.jobs, [job.id]: job },
    })),
}));

