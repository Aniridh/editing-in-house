import { useEffect, useRef, useState } from "react";
import type { Asset, Clip } from "../types";

// Helper to fetch/parse audio once per asset
const bufferCache = new Map<string, Promise<AudioBuffer>>();

async function loadAudioBuffer(ctx: AudioContext, url: string) {
  if (!bufferCache.has(url)) {
    bufferCache.set(
      url,
      fetch(url, { mode: "cors" })
        .then((r) => r.arrayBuffer())
        .then((ab) => ctx.decodeAudioData(ab))
    );
  }
  return bufferCache.get(url)!;
}

type Params = {
  isPlaying: boolean;
  playhead: number; // seconds
  clips: Clip[]; // only audio clips
  assets: Map<string, Asset>;
  masterGain?: number; // 0..1
};

export function useAudioEngine({ isPlaying, playhead, clips, assets, masterGain = 1 }: Params) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const [ready, setReady] = useState(false);

  // currently scheduled nodes
  const nodesRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode }[]>([]);

  // init
  useEffect(() => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      const g = ctx.createGain();
      g.gain.value = masterGain;
      g.connect(ctx.destination);
      ctxRef.current = ctx;
      masterGainRef.current = g;
      setReady(true);
    }
    return () => {
      nodesRef.current.forEach(n => { try { n.source.stop(); } catch {} n.source.disconnect(); n.gain.disconnect(); });
      nodesRef.current = [];
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  // update master gain
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = masterGain;
  }, [masterGain]);

  // stop all scheduled nodes
  const stopAll = async () => {
    nodesRef.current.forEach(({ source, gain }) => {
      try {
        gain.gain.cancelScheduledValues(0);
        gain.gain.setTargetAtTime(0, ctxRef.current!.currentTime, 0.02);
        source.stop(ctxRef.current!.currentTime + 0.05);
      } catch {}
      source.disconnect(); gain.disconnect();
    });
    nodesRef.current = [];
  };

  // (Re)schedule on play/seek
  useEffect(() => {
    if (!ctxRef.current || !masterGainRef.current) return;

    const ctx = ctxRef.current;

    const schedule = async () => {
      await stopAll();
      if (!isPlaying) return;

      const t0 = ctx.currentTime;
      // For each audio clip that intersects timeline after playhead
      const audioClips = clips.filter(c => c.type === "audio");
      for (const c of audioClips) {
        if (!c.assetId) continue;
        const asset = assets.get(c.assetId);
        if (!asset?.url) continue;

        // clip window on timeline
        const clipStart = c.start;
        const clipEnd = c.end;

        // if playhead beyond clip end, skip; if clip starts after playhead, we schedule in future
        if (playhead >= clipEnd) continue;

        const buffer = await loadAudioBuffer(ctx, asset.url);

        // compute when to start relative to AudioContext time
        const when = t0 + Math.max(0, clipStart - playhead);
        const offset = Math.max(0, playhead - clipStart) + (c.inPoint ?? c.in ?? 0);
        const duration = Math.max(0, Math.min(clipEnd - playhead, (c.outPoint ?? c.out ?? buffer.duration) - offset));

        if (duration <= 0) continue;

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.value = 0; // fade in quickly to avoid clicks

        // per-clip volume (if provided)
        if (typeof (c as any).volume_db === "number") {
          const linear = Math.pow(10, (c as any).volume_db / 20);
          gain.gain.value = Math.min(1, Math.max(0, linear));
        }

        if (masterGainRef.current) {
          source.connect(gain).connect(masterGainRef.current);
        }

        // small fades
        const g = gain.gain;
        const fade = 0.03;
        g.setValueAtTime(0, when);
        g.linearRampToValueAtTime(g.value || 1, when + fade);
        g.setValueAtTime(g.value || 1, when + Math.max(0, duration - fade));
        g.linearRampToValueAtTime(0, when + duration);

        try {
          source.start(when, offset, duration);
          nodesRef.current.push({ source, gain });
        } catch (e) {
          // ignore invalid ranges
        }
      }
    };

    schedule();

    // on cleanup or when deps change, stop
    return () => { stopAll(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playhead, clips, assets]);

  // public API (optional)
  return { ready, context: ctxRef.current };
}