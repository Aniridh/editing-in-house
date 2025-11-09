import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { Button } from '../UI/Button';
import type { Clip } from '../../types';

interface CaptionEditorProps {
  clipId: string;
}

export function CaptionEditor({ clipId }: CaptionEditorProps) {
  const tracks = useEditorStore((state) => state.tracks);
  const updateCaption = useEditorStore((state) => state.updateCaption);

  const clip = tracks
    .flatMap((track) => track.clips)
    .find((c) => c.id === clipId && c.type === 'caption');

  const [text, setText] = useState(clip?.text || '');
  const [x, setX] = useState(clip?.x ?? 50); // Default center (percentage)
  const [y, setY] = useState(clip?.y ?? 50);
  const [fontSize, setFontSize] = useState(clip?.fontSize ?? 24);
  const [align, setAlign] = useState<Clip['align']>(clip?.align || 'center');
  const [color, setColor] = useState(clip?.color || '#ffffff');
  const [bg, setBg] = useState(clip?.bg || 'transparent');
  const [opacity, setOpacity] = useState(clip?.opacity ?? 1);
  const [fadeInMs, setFadeInMs] = useState(clip?.fadeInMs ?? 0);
  const [fadeOutMs, setFadeOutMs] = useState(clip?.fadeOutMs ?? 0);

  // Update local state when clip changes
  useEffect(() => {
    if (clip) {
      setText(clip.text || '');
      setX(clip.x ?? 50);
      setY(clip.y ?? 50);
      setFontSize(clip.fontSize ?? 24);
      setAlign(clip.align || 'center');
      setColor(clip.color || '#ffffff');
      setBg(clip.bg || 'transparent');
      setOpacity(clip.opacity ?? 1);
      setFadeInMs(clip.fadeInMs ?? 0);
      setFadeOutMs(clip.fadeOutMs ?? 0);
    }
  }, [clip]);

  if (!clip) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>No caption selected</p>
      </div>
    );
  }

  const handleApply = () => {
    updateCaption(clipId, {
      text,
      x,
      y,
      fontSize,
      align,
      color,
      bg,
      opacity,
      fadeInMs,
      fadeOutMs,
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Caption Editor</h2>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Text */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter caption text..."
            className="w-full p-3 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              X Position (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={x}
              onChange={(e) => setX(parseFloat(e.target.value))}
              className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Y Position (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={y}
              onChange={(e) => setY(parseFloat(e.target.value))}
              className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Font Size (px)
          </label>
          <input
            type="number"
            min="8"
            max="200"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Alignment */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Alignment
          </label>
          <select
            value={align}
            onChange={(e) => setAlign(e.target.value as Clip['align'])}
            className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Text Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 rounded border border-gray-700 cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#ffffff"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Background
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={bg === 'transparent' ? '#000000' : bg}
                onChange={(e) => setBg(e.target.value)}
                className="w-12 h-10 rounded border border-gray-700 cursor-pointer"
              />
              <input
                type="text"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="flex-1 p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="transparent or #000000"
              />
            </div>
          </div>
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Opacity: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Fade In/Out */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fade In (ms)
            </label>
            <input
              type="number"
              min="0"
              max="5000"
              step="100"
              value={fadeInMs}
              onChange={(e) => setFadeInMs(parseInt(e.target.value, 10))}
              className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fade Out (ms)
            </label>
            <input
              type="number"
              min="0"
              max="5000"
              step="100"
              value={fadeOutMs}
              onChange={(e) => setFadeOutMs(parseInt(e.target.value, 10))}
              className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <Button onClick={handleApply} className="w-full">
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
