import { useEffect, useRef } from "react";
import type { Clip, Asset } from "../types";

interface UseAudioEngineProps {
  isPlaying: boolean;
  playhead: number;
  clips: Clip[];
  assetsById: Record<string, Asset>;
  masterGain?: number;
}

export function useAudioEngine({
  isPlaying,
  playhead,
  clips,
  assetsById,
  masterGain = 1,
}: UseAudioEngineProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  useEffect(() => {
    // Stop all sources
    sourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {}
    });
    sourcesRef.current = [];
    gainNodesRef.current = [];

    if (!isPlaying || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const audioClips = clips.filter((c) => c.type === "audio" && c.assetId);

    const schedule = async () => {
      for (const clip of audioClips) {
        if (playhead >= clip.end || playhead < clip.start) continue;
        if (!clip.assetId) continue;
        const asset = assetsById[clip.assetId];
        if (!asset || asset.kind !== "audio") continue;

        try {
          const response = await fetch(asset.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

          const source = ctx.createBufferSource();
          const gainNode = ctx.createGain();
          source.buffer = audioBuffer;
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          gainNode.gain.value = masterGain * (clip.volume_db !== undefined ? Math.pow(10, clip.volume_db / 20) : 1);

          const relativeTime = playhead - clip.start;
          const startTime = clip.in !== undefined ? clip.in + relativeTime : relativeTime;
          const fadeTime = 0.01; // 10ms fade

          if (startTime > fadeTime) {
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(gainNode.gain.value, ctx.currentTime + fadeTime);
          }

          source.start(ctx.currentTime, Math.max(0, startTime));
          sourcesRef.current.push(source);
          gainNodesRef.current.push(gainNode);
        } catch (err) {
          console.error("Audio load error:", err);
        }
      }
    };

    schedule();
  }, [isPlaying, playhead, clips, assetsById, masterGain]);

  return {};
}

