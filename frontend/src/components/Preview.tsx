import { useEditorStore } from '../store/editorStore.js';

export function Preview() {
  const aspectRatio = useEditorStore((state) => state.aspectRatio);
  const playhead = useEditorStore((state) => state.playhead);

  // Calculate aspect ratio for display
  const [width, height] = aspectRatio.split(':').map(Number);
  const aspectRatioValue = width / height;

  return (
    <div className="preview flex-1 flex items-center justify-center bg-black p-8">
      <div
        className="preview-container bg-gray-900 rounded-lg flex items-center justify-center text-gray-500"
        style={{
          aspectRatio: `${width} / ${height}`,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">Preview</div>
          <div className="text-sm">Aspect: {aspectRatio}</div>
          <div className="text-sm mt-2">Playhead: {playhead.toFixed(2)}s</div>
        </div>
      </div>
    </div>
  );
}

