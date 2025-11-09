import React from "react";
import { GeneratorPanel } from "./GeneratorPanel";
import { AssetBin } from "./AssetBin";
import { CommandPanel } from "./CommandPanel";

interface LeftPanelProps {
  activeTab: "generator" | "assets" | "command";
}

export function LeftPanel({ activeTab }: LeftPanelProps) {
  return (
    <div className="bg-[var(--panel)] border-r border-[var(--border)] h-full overflow-hidden flex flex-col">
      {activeTab === "generator" && <GeneratorPanel />}
      {activeTab === "assets" && <AssetBin />}
      {activeTab === "command" && <CommandPanel />}
    </div>
  );
}
