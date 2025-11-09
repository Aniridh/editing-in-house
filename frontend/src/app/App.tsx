import React from "react";
import { EditorShell } from "../components/Layout/EditorShell";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

export function App() {
  useKeyboardShortcuts();
  return <EditorShell />;
}

