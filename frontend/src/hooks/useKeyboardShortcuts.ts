import { useEffect } from "react";
import { useEditorStore } from "../store/editorStore";

export function useKeyboardShortcuts() {
  const setPlayhead = useEditorStore((state) => state.setPlayhead);
  const playhead = useEditorStore((state) => state.playhead);
  const splitClip = useEditorStore((state) => state.splitClip);
  const deleteClip = useEditorStore((state) => state.deleteClip);
  const setZoom = useEditorStore((state) => state.setZoom);
  const zoom = useEditorStore((state) => state.zoom);
  const selection = useEditorStore((state) => state.selection);
  const [isPlaying, setIsPlaying] = [false, () => {}]; // TODO: wire to preview

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        // TODO: toggle play/pause
      } else if (e.code === "KeyS") {
        e.preventDefault();
        if (selection?.clipId) {
          splitClip(selection.clipId, playhead);
        }
      } else if (e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        if (selection?.clipId) {
          deleteClip(selection.clipId);
        }
      } else if (e.code === "Equal" || e.code === "NumpadAdd") {
        e.preventDefault();
        setZoom(zoom * 1.1);
      } else if (e.code === "Minus" || e.code === "NumpadSubtract") {
        e.preventDefault();
        setZoom(zoom / 1.1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playhead, selection, zoom, splitClip, deleteClip, setZoom]);
}

