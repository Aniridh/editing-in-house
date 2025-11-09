import { useEditorStore } from '../store/editorStore.js';
import type { Track, Clip } from '../types.js';

export function Timeline() {
  const tracks = useEditorStore((state) => state.tracks);
  const playhead = useEditorStore((state) => state.playhead);
  const zoom = useEditorStore((state) => state.zoom);

  return (
    <div className="timeline border-t border-gray-300 bg-gray-100 p-4">
      <h2 className="text-lg font-semibold mb-4">Timeline</h2>
      <div className="timeline-content">
        {/* Playhead indicator */}
        <div className="relative mb-2">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${playhead * zoom}px` }}
          >
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full"></div>
          </div>
        </div>

        {/* Tracks */}
        <div className="space-y-2">
          {tracks.map((track) => (
            <TrackRow key={track.id} track={track} zoom={zoom} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrackRow({ track, zoom }: { track: Track; zoom: number }) {
  return (
    <div className="track-row bg-white border border-gray-300 rounded p-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium w-24">{track.type}</span>
        <div className="flex-1 relative h-16 bg-gray-50 rounded">
          {track.clips.map((clip: Clip) => (
            <div
              key={clip.id}
              className="absolute bg-blue-500 text-white text-xs p-1 rounded"
              style={{
                left: `${clip.start * zoom}px`,
                width: `${(clip.end - clip.start) * zoom}px`,
                height: '100%',
              }}
            >
              Clip
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

