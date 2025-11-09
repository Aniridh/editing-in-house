import React, { useState } from "react";
import { generateVideo, generateImage, generateVoice, streamJob } from "../../api/generate";
import { useEditorStore } from "../../store/editorStore";
import { Button } from "../UI/Button";
import { ProgressBar } from "../UI/ProgressBar";
import type { Job } from "../../types";

export function GeneratorPanel() {
  const [activeTab, setActiveTab] = useState<"video" | "image" | "voice">("video");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoAspect, setVideoAspect] = useState("16:9");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageAspect, setImageAspect] = useState("16:9");
  const [voiceText, setVoiceText] = useState("");

  const pushAsset = useEditorStore((state) => state.pushAsset);
  const updateJob = useEditorStore((state) => state.updateJob);
  const jobs = useEditorStore((state) => state.jobs);

  const handleGenerateVideo = async () => {
    try {
      const res = await generateVideo({
        prompt: videoPrompt,
        duration_sec: Math.min(5, videoDuration),
        aspect: videoAspect,
      });
      if ("jobId" in res) {
        const job: Job = { id: res.jobId, kind: "video", status: "queued" };
        updateJob(job);
        streamJob(res.jobId, {
          onEvent: (event, data) => {
            const currentJob = useEditorStore.getState().jobs[res.jobId] || job;
            if (event === "status") {
              updateJob({ ...currentJob, status: data.status });
            } else if (event === "progress") {
              updateJob({ ...currentJob, progress: data.progress });
            } else if (event === "complete") {
              updateJob({ ...currentJob, status: "complete", url: data.url });
              pushAsset({ id: data.url, kind: "video", url: data.url });
            } else if (event === "error") {
              updateJob({ ...currentJob, status: "error", error: data.message });
            }
          },
          onError: (err) => {
            console.error("Job stream error:", err);
            const currentJob = useEditorStore.getState().jobs[res.jobId] || job;
            updateJob({ ...currentJob, status: "error", error: err.message });
          },
        });
      }
    } catch (err) {
      console.error("Generate error:", err);
    }
  };

  const handleGenerateImage = async () => {
    try {
      const res = await generateImage({ prompt: imagePrompt, aspect: imageAspect });
      if ("url" in res) {
        pushAsset({ id: res.url, kind: "image", url: res.url });
      } else if ("jobId" in res) {
        const job: Job = { id: res.jobId, kind: "image", status: "queued" };
        updateJob(job);
        streamJob(res.jobId, {
          onEvent: (event, data) => {
            const currentJob = useEditorStore.getState().jobs[res.jobId] || job;
            if (event === "complete") {
              updateJob({ ...currentJob, status: "complete", url: data.url });
              pushAsset({ id: data.url, kind: "image", url: data.url });
            } else if (event === "error") {
              updateJob({ ...currentJob, status: "error", error: data.message });
            }
          },
        });
      }
    } catch (err) {
      console.error("Generate error:", err);
    }
  };

  const handleGenerateVoice = async () => {
    try {
      const res = await generateVoice({ text: voiceText });
      if ("url" in res) {
        pushAsset({ id: res.url, kind: "audio", url: res.url });
      } else if ("jobId" in res) {
        const job: Job = { id: res.jobId, kind: "voice", status: "queued" };
        updateJob(job);
        streamJob(res.jobId, {
          onEvent: (event, data) => {
            const currentJob = useEditorStore.getState().jobs[res.jobId] || job;
            if (event === "complete") {
              updateJob({ ...currentJob, status: "complete", url: data.url });
              pushAsset({ id: data.url, kind: "audio", url: data.url });
            } else if (event === "error") {
              updateJob({ ...currentJob, status: "error", error: data.message });
            }
          },
        });
      }
    } catch (err) {
      console.error("Generate error:", err);
    }
  };

  const allJobs = Object.values(jobs);
  const activeJobs = allJobs.filter((j) => j.status === "queued" || j.status === "generating");

  return (
    <div className="h-full flex flex-col bg-[var(--panel)]">
      <div className="flex border-b border-[var(--border)]">
        {(["video", "image", "voice"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? "text-blue-400 border-blue-400"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "video" && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Prompt</label>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Describe the video you want to generate..."
                className="w-full p-3 bg-[var(--bg)] text-zinc-200 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none placeholder:text-zinc-500 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Duration (seconds, max 5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={videoDuration}
                onChange={(e) => setVideoDuration(parseInt(e.target.value, 10))}
                className="w-full p-2 bg-[var(--bg)] text-zinc-200 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Aspect Ratio</label>
              <select
                value={videoAspect}
                onChange={(e) => setVideoAspect(e.target.value)}
                className="w-full p-2 bg-[var(--bg)] text-zinc-200 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>
            <Button onClick={handleGenerateVideo} disabled={!videoPrompt.trim()}>
              Generate Video
            </Button>
          </>
        )}
        {activeTab === "image" && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Prompt</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full p-3 bg-[var(--bg)] text-zinc-200 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none placeholder:text-zinc-500 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Aspect Ratio</label>
              <select
                value={imageAspect}
                onChange={(e) => setImageAspect(e.target.value)}
                className="w-full p-2 bg-[var(--bg)] text-zinc-200 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>
            <Button onClick={handleGenerateImage} disabled={!imagePrompt.trim()}>
              Generate Image
            </Button>
          </>
        )}
        {activeTab === "voice" && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Text</label>
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Enter the text to convert to speech..."
                className="w-full p-3 bg-[var(--bg)] text-zinc-200 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none placeholder:text-zinc-500 text-sm"
                rows={5}
              />
            </div>
            <Button onClick={handleGenerateVoice} disabled={!voiceText.trim()}>
              Generate Voiceover
            </Button>
          </>
        )}
        {allJobs.length > 0 && (
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <h3 className="text-xs font-semibold text-zinc-300 mb-3">Jobs</h3>
            <div className="space-y-2">
              {allJobs.map((job) => (
                <div key={job.id} className="p-2 bg-[var(--bg)] rounded border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300">{job.kind}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      job.status === "complete" ? "bg-green-600 text-white" :
                      job.status === "error" ? "bg-red-600 text-white" :
                      job.status === "generating" ? "bg-blue-600 text-white" :
                      "bg-zinc-600 text-white"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  {(job.status === "queued" || job.status === "generating") && (
                    <ProgressBar progress={job.progress || 0} label={`Generating ${job.kind}...`} />
                  )}
                  {job.status === "error" && job.error && (
                    <p className="text-xs text-red-400 mt-1">{job.error}</p>
                  )}
                  {job.status === "complete" && job.url && (
                    <p className="text-xs text-green-400 mt-1">Complete</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
