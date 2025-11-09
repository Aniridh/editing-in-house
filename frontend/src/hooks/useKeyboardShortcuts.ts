import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export function useKeyboardShortcuts() {
  const playhead = useEditorStore((state) => state.playhead);
  const setPlayhead = useEditorStore((state) => state.setPlayhead);
  const setZoom = useEditorStore((state) => state.setZoom);
  const zoom = useEditorStore((state) => state.zoom);
  const selection = useEditorStore((state) => state.selection);
  const deleteClip = useEditorStore((state) => state.deleteClip);
  const splitClip = useEditorStore((state) => state.splitClip);
  const tracks = useEditorStore((state) => state.tracks);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Prevent default for handled shortcuts
      const handledKeys = [
        ' ',
        'ArrowLeft',
        'ArrowRight',
        's',
        'S',
        'Delete',
        'Backspace',
        'u',
        'U',
        '+',
        '=',
        '-',
        '_',
      ];

      if (!handledKeys.includes(e.key)) {
        return;
      }

      // Space: Play/pause (handled by Preview component)
      if (e.key === ' ') {
        // Let Preview handle this
        return;
      }

      // Arrow keys: Seek
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayhead(Math.max(0, playhead - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlayhead(playhead + 1);
      }

      // S: Split at playhead
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const clipAtPlayhead = tracks
          .flatMap((t) => t.clips)
          .find((c) => playhead > c.start && playhead < c.end);
        if (clipAtPlayhead) {
          splitClip(clipAtPlayhead.id, playhead);
        }
      }

      // Delete/Backspace: Remove selected clips
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length > 0) {
        e.preventDefault();
        selection.forEach((clipId) => deleteClip(clipId));
      }

      // U: Undo, Shift+U: Redo
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+U: Redo
          if (canRedo()) {
            redo();
          }
        } else {
          // U: Undo
          if (canUndo()) {
            undo();
          }
        }
      }

      // +/-: Zoom
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(Math.min(1000, zoom * 1.1));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom(Math.max(10, zoom * 0.9));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    playhead,
    setPlayhead,
    setZoom,
    zoom,
    selection,
    deleteClip,
    splitClip,
    tracks,
    undo,
    redo,
    canUndo,
    canRedo,
  ]);
}
