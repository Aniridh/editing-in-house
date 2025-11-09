import React, { useState } from "react";
import { Sparkles, Images, MessageSquare } from "lucide-react";

type TabType = "generator" | "assets" | "command";

interface LeftRailProps {
  onTabChange: (tab: TabType) => void;
  activeTab: TabType;
}

export function LeftRail({ onTabChange, activeTab }: LeftRailProps) {

  const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
    { id: "generator", icon: <Sparkles size={18} />, label: "Generator" },
    { id: "assets", icon: <Images size={18} />, label: "Assets" },
    { id: "command", icon: <MessageSquare size={18} />, label: "Command" },
  ];

  return (
    <div className="bg-[var(--surface)] border-r border-[var(--border)] flex flex-col items-center gap-3 py-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            activeTab === tab.id
              ? "bg-[var(--accent)] text-white"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[var(--panel)]"
          }`}
          aria-label={tab.label}
          title={tab.label}
        >
          {tab.icon}
        </button>
      ))}
    </div>
  );
}

