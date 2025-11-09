import { useMemo } from "react";
import { useEditorStore } from "../../store/editorStore";
import type { Clip } from "../../types";

export default function CaptionEditor() {
  const { tracks, selection, updateClip } = useEditorStore((s) => ({
    tracks: s.tracks,
    selection: s.selection,
    updateClip: s.updateClip,
  }));

  const clip = useMemo<Clip | undefined>(
    () => {
      const allClips = tracks.flatMap(t => t.clips);
      return allClips.find((c) => c.id === selection?.[0] && c.type === "caption");
    },
    [tracks, selection]
  );

  if (!clip || clip.type !== "caption") {
    return (
      <div className="p-3 text-sm text-neutral-500">
        Select a caption clip to edit its properties.
      </div>
    );
  }

  const onNum = (k: keyof Clip) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateClip(clip.id, { [k]: Number(e.target.value) } as Partial<Clip>);

  const onText = (k: keyof Clip) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    updateClip(clip.id, { [k]: e.target.value } as Partial<Clip>);

  const onRange01 = (k: keyof Clip) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateClip(clip.id, { [k]: Math.max(0, Math.min(1, Number(e.target.value))) } as Partial<Clip>);

  const onColor = (k: keyof Clip) => (e: React.ChangeEvent<HTMLInputElement>) =>
    updateClip(clip.id, { [k]: e.target.value } as Partial<Clip>);

  const onSelect = (k: keyof Clip) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    updateClip(clip.id, { [k]: e.target.value } as Partial<Clip>);

  const defaults: Required<Pick<Clip, "text"|"x"|"y"|"fontSize"|"align"|"color"|"bg"|"opacity"|"fadeInMs"|"fadeOutMs">> = {
    text: "",
    x: 0.5,
    y: 0.8,
    fontSize: 48,
    align: "center",
    color: "#ffffff",
    bg: "rgba(0,0,0,0.4)",
    opacity: 1,
    fadeInMs: 150,
    fadeOutMs: 150,
  };

  const v = { ...defaults, ...clip };

  return (
    <div className="space-y-3 p-3 bg-gray-900">
      <div>
        <label className="block text-xs mb-1 text-gray-300">Text</label>
        <textarea
          className="w-full rounded border border-gray-700 bg-gray-800 text-white p-2 text-sm"
          rows={3}
          value={v.text}
          onChange={onText("text")}
          placeholder="Enter caption text…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1 text-gray-300">X (0–1)</label>
          <input type="number" step="0.01" min={0} max={1} className="w-full border border-gray-700 bg-gray-800 text-white rounded p-1"
            value={v.x} onChange={onRange01("x")} />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-300">Y (0–1)</label>
          <input type="number" step="0.01" min={0} max={1} className="w-full border border-gray-700 bg-gray-800 text-white rounded p-1"
            value={v.y} onChange={onRange01("y")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1 text-gray-300">Font Size (px)</label>
          <input type="number" min={8} max={200} className="w-full border border-gray-700 bg-gray-800 text-white rounded p-1"
            value={v.fontSize} onChange={onNum("fontSize")} />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-300">Align</label>
          <select className="w-full border border-gray-700 bg-gray-800 text-white rounded p-1" value={v.align} onChange={onSelect("align")}>
            <option>left</option><option>center</option><option>right</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1 text-gray-300">Text Color</label>
          <input type="color" value={v.color} onChange={onColor("color")} className="w-full h-8 p-0 border border-gray-700 rounded" />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-300">BG (optional)</label>
          <input type="text" className="w-full border border-gray-700 bg-gray-800 text-white rounded p-1"
            value={v.bg ?? ""} onChange={onText("bg")} placeholder="e.g. rgba(0,0,0,0.4) or empty" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs mb-1 text-gray-300">Opacity (0–1)</label>
          <input type="number" step="0.05" min={0} max={1} className="w-full border border-gray-700 bg-gray-800 text-white rounded p-1"
            value={v.opacity} onChange={onRange01("opacity")} />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-300">Fade In (ms)</label>
          <input type="number" min={0} max={2000} className="w-full border border-gray-700 bg-gray-800 text-white rounded p-1"
            value={v.fadeInMs} onChange={onNum("fadeInMs")} />
        </div>
        <div>
          <label className="block text-xs mb-1 text-gray-300">Fade Out (ms)</label>
          <input type="number" min={0} max={2000} className="w-full border border-gray-700 bg-gray-800 text-white rounded p-1"
            value={v.fadeOutMs} onChange={onNum("fadeOutMs")} />
        </div>
      </div>
    </div>
  );
}