import { useState, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { Button } from '../UI/Button';
import { formatTime } from '../../utils/timeline';
import { generateVideoThumbnails, generateAudioWaveform } from '../../utils/thumbnails';
import type { Asset } from '../../types';

export function AssetBin() {
  const assets = useEditorStore((state) => state.assets);
  const addAsset = useEditorStore((state) => state.addAsset);
  const removeAsset = useEditorStore((state) => state.removeAsset);
  const tracks = useEditorStore((state) => state.tracks);
  const playhead = useEditorStore((state) => state.playhead);
  const insertClip = useEditorStore((state) => state.insertClip);
  const setSelection = useEditorStore((state) => state.setSelection);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assetArray = Array.from(assets.values());

  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData('assetId', assetId);
  };

  const handleInsertAtPlayhead = (assetId: string) => {
    const asset = assets.get(assetId);
    if (!asset) return;

    const track = tracks.find((t) => t.type === (asset.type === 'video' ? 'video' : 'audio'));
    if (!track) return;

    const clip = {
      id: `clip-${Date.now()}`,
      assetId,
      trackId: track.id,
      start: playhead,
      end: playhead + (asset.duration || 5),
      inPoint: 0,
      outPoint: asset.duration || 5,
    };

    insertClip(clip);
  };

  const handleCreateCaption = () => {
    const overlayTrack = tracks.find((t) => t.type === 'overlay');
    if (!overlayTrack) return;

    const captionClip = {
      id: `caption-${Date.now()}`,
      trackId: overlayTrack.id,
      track: 'overlay' as const,
      start: playhead,
      end: playhead + 2, // Default 2 seconds
      inPoint: 0,
      outPoint: 2,
      type: 'caption' as const,
      text: 'New Caption',
      x: 0.5,
      y: 0.8,
      fontSize: 24,
      align: 'center' as const,
      color: '#ffffff',
      bg: 'transparent',
      opacity: 1,
      fadeInMs: 0,
      fadeOutMs: 0,
    };

    insertClip(captionClip);
    setSelection([captionClip.id]);
  };

  const handleImportMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);

    try {
      for (const file of Array.from(files)) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let assetType: Asset['type'] | null = null;

        // Determine asset type from extension
        if (['mp4', 'webm', 'mov'].includes(fileExtension || '')) {
          assetType = 'video';
        } else if (['wav', 'mp3', 'm4a', 'ogg'].includes(fileExtension || '')) {
          assetType = 'audio';
        } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExtension || '')) {
          assetType = 'image';
        }

        if (!assetType) {
          console.warn(`Unsupported file type: ${fileExtension}`);
          continue;
        }

        // Create ObjectURL for local file
        const objectUrl = URL.createObjectURL(file);

        // Get file duration for video/audio
        let duration: number | undefined;
        if (assetType === 'video' || assetType === 'audio') {
          duration = await getMediaDuration(objectUrl, assetType);
        }

        // Create asset entry
        const asset: Asset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: objectUrl,
          type: assetType,
          duration,
          createdAt: Date.now(),
        };

        // Add asset (this will trigger thumbnail/waveform generation)
        addAsset(asset);

        // Generate thumbnails/waveforms for local files
        if (assetType === 'video') {
          generateVideoThumbnails(objectUrl, 10)
            .then((thumbnails) => {
              const updatedAsset = useEditorStore.getState().assets.get(asset.id);
              if (updatedAsset) {
                addAsset({
                  ...updatedAsset,
                  metadata: {
                    ...updatedAsset.metadata,
                    thumbnails,
                  },
                });
              }
            })
            .catch((error) => {
              console.error('Error generating thumbnails for local file:', error);
            });
        } else if (assetType === 'audio') {
          generateAudioWaveform(objectUrl, 200)
            .then((waveform) => {
              const updatedAsset = useEditorStore.getState().assets.get(asset.id);
              if (updatedAsset) {
                addAsset({
                  ...updatedAsset,
                  metadata: {
                    ...updatedAsset.metadata,
                    waveform,
                  },
                });
              }
            })
            .catch((error) => {
              console.error('Error generating waveform for local file:', error);
            });
        }
      }
    } catch (error) {
      console.error('Error importing media:', error);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper function to get media duration
  const getMediaDuration = (url: string, type: 'video' | 'audio'): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (type === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve(video.duration);
        };
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = url;
      } else {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          resolve(audio.duration);
        };
        audio.onerror = () => reject(new Error('Failed to load audio'));
        audio.src = url;
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Assets</h2>
            <p className="text-sm text-gray-400 mt-1">{assetArray.length} asset(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.mov,.wav,.mp3,.m4a,.ogg,.png,.jpg,.jpeg,.gif,.webp"
              multiple
              onChange={handleImportMedia}
              className="hidden"
              aria-label="Import media files"
            />
            <Button
              as="span"
              variant="secondary"
              className="text-xs"
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Import Media'}
            </Button>
          </label>
          <Button onClick={handleCreateCaption} variant="secondary" className="text-xs">
            + Caption
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {assetArray.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No assets yet</p>
            <p className="text-sm mt-2">Generate content to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assetArray.map((asset) => (
              <div
                key={asset.id}
                data-asset-id={asset.id}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-blue-500 transition-colors"
                draggable
                onDragStart={(e) => handleDragStart(e, asset.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-600 rounded text-white">
                        {asset.type}
                      </span>
                      {asset.duration && (
                        <span className="text-xs text-gray-400">
                          {formatTime(asset.duration)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mt-1 truncate" title={asset.url}>
                      {asset.url.split('/').pop()?.split('?')[0] || asset.id}
                    </p>
                  </div>
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="text-gray-400 hover:text-red-400 focus:outline-none"
                    aria-label="Delete asset"
                  >
                    ×
                  </button>
                </div>

                {asset.type === 'image' && (
                  <img
                    src={asset.url}
                    alt=""
                    className="w-full h-32 object-cover rounded mt-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}

                {(asset.type === 'video' || asset.type === 'audio' || asset.type === 'voiceover') && (
                  <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-gray-400 text-center">
                    {asset.type === 'video' ? '🎥' : '🔊'} Media file
                  </div>
                )}

                <Button
                  onClick={() => handleInsertAtPlayhead(asset.id)}
                  variant="secondary"
                  className="w-full mt-2 text-sm"
                >
                  Insert at Playhead
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
