import React, { useState, useEffect } from "react";
import { Circle } from "lucide-react";
import { Button } from "./UI/Button";
import { json } from "../api/client";
import { useEditorStore } from "../store/editorStore";
import { useExport } from "../hooks/useExport";

interface TopBarProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  previewContainerRef: React.RefObject<HTMLDivElement>;
}

export function TopBar({ videoRef, previewContainerRef }: TopBarProps) {
  const [demoMode, setDemoMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"online" | "offline">("offline");
  const [showExportModal, setShowExportModal] = useState(false);
  const { exportVideo, isExporting, progress } = useExport(previewContainerRef, {
    fps: 30,
    width: 1920,
    height: 1080,
    maxDurationSec: 20,
    fileName: "export.webm",
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await json("/health");
        setConnectionStatus("online");
      } catch {
        setConnectionStatus("offline");
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    const state = useEditorStore.getState();
    const data = {
      assets: state.assets,
      clips: state.clips,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.ainle.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        useEditorStore.setState({ assets: data.assets || [], clips: data.clips || [] });
      } catch (err) {
        console.error("Load error:", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-12 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <h1 className="text-sm font-semibold text-zinc-200">AI NLE</h1>
        </div>
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[var(--panel)] rounded transition-colors">
            File
          </button>
          <button className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[var(--panel)] rounded transition-colors">
            Settings
          </button>
          <button className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[var(--panel)] rounded transition-colors">
            Help
          </button>
        </div>
        <div className="h-4 w-px bg-[var(--border)]"></div>
        <span className="text-xs text-zinc-400">Template - Project</span>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
            className="w-3.5 h-3.5 accent-[var(--accent)] cursor-pointer"
          />
          <span className="text-zinc-400">Demo Mode</span>
        </label>
        <Button onClick={handleSave} variant="secondary">
          Save Project
        </Button>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".ainle.json,application/json"
            onChange={handleLoad}
            className="hidden"
          />
          <Button variant="secondary" as="span">
            Load Project
          </Button>
        </label>
        <Button
          onClick={exportVideo}
          disabled={isExporting}
          variant="primary"
        >
          {isExporting ? `Exporting... ${Math.round(progress)}%` : "Export"}
        </Button>
        <div className="flex items-center gap-1.5">
          <Circle
            size={8}
            fill={connectionStatus === "online" ? "#10b981" : "#ef4444"}
            color={connectionStatus === "online" ? "#10b981" : "#ef4444"}
          />
          <span className="text-xs text-zinc-400">{connectionStatus}</span>
        </div>
      </div>
    </div>
  );
}
