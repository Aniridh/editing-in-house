import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { Action } from '../types';

interface Command {
  id: string;
  label: string;
  keywords: string[];
  action: () => void | Promise<void>;
  category: 'edit' | 'generate' | 'settings' | 'view';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const playhead = useEditorStore((state) => state.playhead);
  const selection = useEditorStore((state) => state.selection);
  const tracks = useEditorStore((state) => state.tracks);
  const assets = useEditorStore((state) => state.assets);
  const setPlayhead = useEditorStore((state) => state.setPlayhead);
  const setAspectRatio = useEditorStore((state) => state.setAspectRatio);
  const splitClip = useEditorStore((state) => state.splitClip);
  const deleteClip = useEditorStore((state) => state.deleteClip);
  const insertClip = useEditorStore((state) => state.insertClip);

  // Build commands
  const allCommands: Command[] = [
    // Edit commands
    {
      id: 'split',
      label: 'Split Clip at Playhead',
      keywords: ['split', 'cut', 'divide'],
      category: 'edit',
      action: () => {
        if (selection.length === 1) {
          const clipId = selection[0];
          splitClip(clipId, playhead);
          onClose();
        }
      },
    },
    {
      id: 'ripple-delete',
      label: 'Ripple Delete Selected Clip',
      keywords: ['delete', 'remove', 'ripple'],
      category: 'edit',
      action: () => {
        if (selection.length > 0) {
          selection.forEach((clipId) => deleteClip(clipId, true));
          onClose();
        }
      },
    },
    {
      id: 'insert-at-playhead',
      label: 'Insert Asset at Playhead',
      keywords: ['insert', 'add', 'place'],
      category: 'edit',
      action: () => {
        // This would need asset selection - for now just show message
        const firstAsset = Array.from(assets.values())[0];
        if (firstAsset) {
          const videoTrack = tracks.find((t) => t.type === 'video');
          if (videoTrack) {
            const clip = {
              id: `clip-${Date.now()}`,
              assetId: firstAsset.id,
              trackId: videoTrack.id,
              start: playhead,
              end: playhead + (firstAsset.duration || 5),
              inPoint: 0,
              outPoint: firstAsset.duration || 5,
            };
            insertClip(clip);
            onClose();
          }
        }
      },
    },
    // Generate commands
    {
      id: 'generate-clip',
      label: 'Generate Clip...',
      keywords: ['generate', 'create', 'video', 'clip'],
      category: 'generate',
      action: () => {
        // Focus generator panel or open modal
        onClose();
        // Could emit event or use ref to focus generator
      },
    },
    {
      id: 'generate-image',
      label: 'Generate Image...',
      keywords: ['generate', 'create', 'image', 'photo'],
      category: 'generate',
      action: () => {
        onClose();
      },
    },
    {
      id: 'generate-voiceover',
      label: 'Generate Voiceover...',
      keywords: ['generate', 'create', 'voice', 'voiceover', 'audio'],
      category: 'generate',
      action: () => {
        onClose();
      },
    },
    // Settings commands
    {
      id: 'aspect-16-9',
      label: 'Set Aspect Ratio 16:9',
      keywords: ['aspect', 'ratio', '16:9', 'horizontal', 'landscape'],
      category: 'settings',
      action: () => {
        setAspectRatio('16:9');
        onClose();
      },
    },
    {
      id: 'aspect-9-16',
      label: 'Set Aspect Ratio 9:16',
      keywords: ['aspect', 'ratio', '9:16', 'vertical', 'portrait'],
      category: 'settings',
      action: () => {
        setAspectRatio('9:16');
        onClose();
      },
    },
    {
      id: 'aspect-1-1',
      label: 'Set Aspect Ratio 1:1',
      keywords: ['aspect', 'ratio', '1:1', 'square'],
      category: 'settings',
      action: () => {
        setAspectRatio('1:1');
        onClose();
      },
    },
  ];

  // Filter commands based on search
  const filteredCommands = allCommands.filter((cmd) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.keywords.some((kw) => kw.toLowerCase().includes(searchLower))
    );
  });

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[data-command-index]');
      const selectedItem = items[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    edit: 'Edit',
    generate: 'Generate',
    settings: 'Settings',
    view: 'View',
  };

  // Flatten commands for indexing
  const flatCommands = filteredCommands;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-32 z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-4 border-b border-gray-700">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full px-4 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Commands list */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto"
        >
          {Object.entries(groupedCommands).map(([category, commands]) => {
            // Find starting index for this category
            const categoryStartIndex = flatCommands.findIndex((c) => c.category === category && commands.includes(c));
            return (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {categoryLabels[category]}
                </div>
                {commands.map((cmd, cmdIdx) => {
                  const index = categoryStartIndex + cmdIdx;
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      data-command-index={index}
                      onClick={() => cmd.action()}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {cmd.label}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400">
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-between">
          <div>
            <kbd className="px-2 py-1 bg-gray-700 rounded">↑↓</kbd> Navigate{' '}
            <kbd className="px-2 py-1 bg-gray-700 rounded">Enter</kbd> Select{' '}
            <kbd className="px-2 py-1 bg-gray-700 rounded">Esc</kbd> Close
          </div>
        </div>
      </div>
    </div>
  );
}
