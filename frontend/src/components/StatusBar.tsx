import { useEditorStore } from '../store/editorStore';
import { formatTime } from '../utils/timeline';

export function StatusBar() {
  const playhead = useEditorStore((state) => state.playhead);
  const zoom = useEditorStore((state) => state.zoom);
  const selection = useEditorStore((state) => state.selection);
  const tracks = useEditorStore((state) => state.tracks);
  const assets = useEditorStore((state) => state.assets);

  // Calculate timeline duration
  let maxEnd = 0;
  tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      maxEnd = Math.max(maxEnd, clip.end);
    });
  });

  const totalClips = tracks.reduce((sum, track) => sum + track.clips.length, 0);

  return (
    <div className="h-8 bg-gray-900 border-t border-gray-700 flex items-center px-4 text-sm text-gray-300">
      <div className="flex items-center gap-4">
        <span className="tabular-nums">Playhead: {formatTime(playhead)}</span>
        <span className="tabular-nums">Duration: {formatTime(maxEnd)}</span>
        <span>Zoom: {zoom.toFixed(0)} px/s</span>
        <span>Clips: {totalClips}</span>
        <span>Assets: {assets.size}</span>
        {selection.length > 0 && (
          <span className="text-blue-400">Selected: {selection.length}</span>
        )}
      </div>
    </div>
  );
}
