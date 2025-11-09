import React, { useState, useRef } from "react";
import { TopBar } from "../TopBar";
import { LeftRail } from "../LeftRail";
import { LeftPanel } from "../Panels/LeftPanel";
import { Preview } from "../Editor/Preview";
import { Inspector } from "../Panels/Inspector";
import { Timeline } from "../Editor/Timeline";
import { StatusBar } from "../StatusBar";

export function EditorShell() {
  const [leftPanelTab, setLeftPanelTab] = useState<"generator" | "assets" | "command">("generator");
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="h-screen w-screen bg-[var(--bg)] text-zinc-200"
      style={{
        display: "grid",
        gridTemplateRows: "48px 1fr 280px 28px",
        gridTemplateColumns: "56px 320px 1fr 320px",
      }}
    >
      <div style={{ gridRow: "1", gridColumn: "1 / -1" }}>
        <TopBar videoRef={videoRef} previewContainerRef={previewContainerRef} />
      </div>
      <div style={{ gridRow: "2", gridColumn: "1" }}>
        <LeftRail activeTab={leftPanelTab} onTabChange={setLeftPanelTab} />
      </div>
      <div style={{ gridRow: "2", gridColumn: "2" }}>
        <LeftPanel activeTab={leftPanelTab} />
      </div>
      <div style={{ gridRow: "2", gridColumn: "3" }}>
        <Preview videoRef={videoRef} containerRef={previewContainerRef} />
      </div>
      <div style={{ gridRow: "2", gridColumn: "4" }}>
        <Inspector />
      </div>
      <div style={{ gridRow: "3", gridColumn: "1 / -1" }}>
        <Timeline />
      </div>
      <div style={{ gridRow: "4", gridColumn: "1 / -1" }}>
        <StatusBar />
      </div>
    </div>
  );
}

