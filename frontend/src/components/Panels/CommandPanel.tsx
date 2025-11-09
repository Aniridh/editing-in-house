import React, { useState } from "react";
import { interpret } from "../../api/interpret";
import { generateVideo, streamJob } from "../../api/generate";
import { useEditorStore } from "../../store/editorStore";
import { Button } from "../UI/Button";
import type { Job } from "../../types";

const COMMAND_HINTS = [
  { label: "3s skyline b-roll (9:16)", prompt: "generate 3 second video of city skyline, 9:16 aspect" },
  { label: "Add caption...", prompt: "add caption 'Hello World' at 2 seconds" },
  { label: "Split at 2s", prompt: "split clip at 2 seconds" },
];

export function CommandPanel() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actions, setActions] = useState<any[]>([]);
  const [showHints, setShowHints] = useState(true);

  const insertClip = useEditorStore((state) => state.insertClip);
  const pushAsset = useEditorStore((state) => state.pushAsset);
  const updateJob = useEditorStore((state) => state.updateJob);
  const assets = useEditorStore((state) => state.assets);
  const playhead = useEditorStore((state) => state.playhead);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsLoading(true);
    setShowHints(false);
    try {
      const res = await interpret(prompt);
      setActions(res.actions);
      // Execute actions
      for (const action of res.actions) {
        if (action.action === "generate_clip" && action.params) {
          // Handle generate_clip action
          const { prompt: genPrompt, duration_sec, aspect } = action.params;
          try {
            const genRes = await generateVideo({
              prompt: genPrompt || prompt,
              duration_sec: duration_sec || 4,
              aspect: aspect || "9:16",
            });
            if ("jobId" in genRes) {
              const job: Job = { id: genRes.jobId, kind: "video", status: "queued" };
              updateJob(job);
              streamJob(genRes.jobId, {
                onEvent: (event, data) => {
                  if (event === "status") {
                    updateJob({ ...job, status: data.status });
                  } else if (event === "progress") {
                    updateJob({ ...job, progress: data.progress });
                  } else if (event === "complete") {
                    updateJob({ ...job, status: "complete", url: data.url });
                    pushAsset({ id: data.url, kind: "video", url: data.url });
                  } else if (event === "error") {
                    updateJob({ ...job, status: "error", error: data.message });
                  }
                },
              });
            }
          } catch (err) {
            console.error("Generate error:", err);
          }
        } else if (action.action === "insert" && action.params?.assetId) {
          const asset = assets.find((a) => a.id === action.params.assetId);
          if (asset) {
            insertClip({
              id: `clip-${Date.now()}`,
              assetId: asset.id,
              type: asset.kind === "video" ? "video" : asset.kind === "image" ? "image" : "audio",
              track: asset.kind === "audio" ? "audio" : "video",
              start: playhead,
              end: playhead + (asset.meta?.duration || 5),
            });
          }
        } else if (action.action === "set_caption" && action.params) {
          // Create caption clip
          insertClip({
            id: `caption-${Date.now()}`,
            type: "caption",
            track: "overlay",
            start: action.params.start || playhead,
            end: (action.params.start || playhead) + (action.params.duration || 2),
            text: action.params.text || "",
            x: action.params.x || 0.5,
            y: action.params.y || 0.5,
            fontSize: action.params.fontSize || 24,
            color: action.params.color || "#ffffff",
          });
        } else if (action.action === "split" && action.params?.at) {
          // Find clip at the specified time
          const clips = useEditorStore.getState().clips;
          const clipAtTime = clips.find(
            (c) => c.start <= action.params.at && c.end >= action.params.at
          );
          if (clipAtTime) {
            useEditorStore.getState().splitClip(clipAtTime.id, action.params.at);
          }
        }
        // TODO: Handle other actions (move, trim, delete, set_aspect, etc.)
      }
    } catch (err) {
      console.error("Interpret error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--panel)]">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Command</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your command..."
          className="flex-1 w-full p-3 bg-[var(--bg)] text-zinc-200 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none placeholder:text-zinc-500 text-sm font-mono"
          disabled={isLoading}
        />
        {showHints && actions.length === 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-400 font-semibold uppercase">Try these:</div>
            <div className="flex flex-wrap gap-1.5">
              {COMMAND_HINTS.map((hint, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPrompt(hint.prompt);
                    setShowHints(false);
                  }}
                  className="px-2.5 py-1.5 bg-[var(--surface)] hover:bg-[var(--panel)] border border-[var(--border)] text-zinc-200 rounded text-xs"
                >
                  {hint.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {actions.length > 0 && (
          <div className="p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs">
            <div className="font-semibold mb-1.5 text-[var(--accent)]">Actions:</div>
            <ul className="space-y-0.5 text-zinc-300">
              {actions.map((a, i) => (
                <li key={i}>• {a.action}</li>
              ))}
            </ul>
          </div>
        )}
        <Button type="submit" disabled={isLoading || !prompt.trim()}>
          {isLoading ? "Processing..." : "Execute"}
        </Button>
      </form>
    </div>
  );
}
