import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { generateVideo, generateImage, generateVoiceover } from '../../api/generate';
import { useSSE } from '../../hooks/useSSE';
import { Button } from '../UI/Button';
import { ProgressBar } from '../UI/ProgressBar';
import { JobRow } from './JobRow';
import { JobSSEManager } from './JobSSEManager';

type TabType = 'video' | 'image' | 'voiceover';

export function GeneratorPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('video');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoAspect, setVideoAspect] = useState('16:9');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspect, setImageAspect] = useState('16:9');
  const [voiceText, setVoiceText] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const demoMode = false; // TODO: Add demo mode toggle
  const addAsset = useEditorStore((state) => state.addAsset);
  const updateJob = useEditorStore((state) => state.updateJob);
  const jobs = useEditorStore((state) => state.jobs);
  const assets = useEditorStore((state) => state.assets);

  // Use SSE for active job (for backward compatibility)
  useSSE(activeJobId, demoMode);

  const activeJob = activeJobId ? jobs.get(activeJobId) : null;
  const allJobs = Array.from(jobs.values());

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) return;

    try {
      const result = await generateVideo(videoPrompt, videoDuration, videoAspect, demoMode);
      setActiveJobId(result.jobId);

      // Create job entry
      updateJob({
        id: result.jobId,
        status: result.url ? 'complete' : 'generating',
        progress: result.url ? 100 : 0,
        url: result.url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // If URL is immediate, add asset
      if (result.url) {
        addAsset({
          id: `asset-${Date.now()}`,
          url: result.url,
          type: 'video',
          duration: videoDuration,
          metadata: { aspectRatio: videoAspect },
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Generate video error:', error);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;

    try {
      const result = await generateImage(imagePrompt, imageAspect, demoMode);
      setActiveJobId(result.jobId);

      updateJob({
        id: result.jobId,
        status: result.url ? 'complete' : 'generating',
        progress: result.url ? 100 : 0,
        url: result.url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (result.url) {
        addAsset({
          id: `asset-${Date.now()}`,
          url: result.url,
          type: 'image',
          metadata: { aspectRatio: imageAspect },
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Generate image error:', error);
    }
  };

  const handleGenerateVoiceover = async () => {
    if (!voiceText.trim()) return;

    try {
      const result = await generateVoiceover(voiceText, undefined, demoMode);
      setActiveJobId(result.jobId);

      updateJob({
        id: result.jobId,
        status: result.url ? 'complete' : 'generating',
        progress: result.url ? 100 : 0,
        url: result.url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (result.url) {
        addAsset({
          id: `asset-${Date.now()}`,
          url: result.url,
          type: 'voiceover',
          createdAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('Generate voiceover error:', error);
    }
  };

  // Watch for job completion and add asset
  useEffect(() => {
    if (activeJob && activeJob.status === 'complete' && activeJob.url) {
      const assets = useEditorStore.getState().assets;
      const assetExists = Array.from(assets.values()).some((a) => a.url === activeJob.url);
      if (!assetExists && activeJob.url) {
        // Determine asset type from active tab
        const assetType = activeTab === 'video' ? 'video' : activeTab === 'image' ? 'image' : 'voiceover';
        addAsset({
          id: `asset-${activeJob.id}`,
          url: activeJob.url,
          type: assetType,
          createdAt: Date.now(),
        });
      }
    }
  }, [activeJob, addAsset, activeTab]);

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      {/* SSE Manager for all active jobs */}
      <JobSSEManager demoMode={demoMode} />
      
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Generator</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['video', 'image', 'voiceover'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            aria-label={`${tab} tab`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Video Tab */}
        {activeTab === 'video' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Prompt
              </label>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Describe the video you want to generate..."
                className="w-full p-3 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Duration (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={videoDuration}
                onChange={(e) => setVideoDuration(parseInt(e.target.value, 10))}
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Aspect Ratio
              </label>
              <select
                value={videoAspect}
                onChange={(e) => setVideoAspect(e.target.value)}
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>

            {activeJob && (
              <div>
                <ProgressBar
                  progress={activeJob.progress || 0}
                  label="Generating video..."
                />
                {activeJob.status === 'error' && (
                  <p className="text-red-400 text-sm mt-2">{activeJob.error}</p>
                )}
              </div>
            )}

            <Button onClick={handleGenerateVideo} disabled={!videoPrompt.trim() || (activeJob?.status === 'generating')}>
              Generate Video
            </Button>
          </div>
        )}

        {/* Image Tab */}
        {activeTab === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Prompt
              </label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full p-3 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Aspect Ratio
              </label>
              <select
                value={imageAspect}
                onChange={(e) => setImageAspect(e.target.value)}
                className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>

            {activeJob && (
              <div>
                <ProgressBar
                  progress={activeJob.progress || 0}
                  label="Generating image..."
                />
                {activeJob.status === 'error' && (
                  <p className="text-red-400 text-sm mt-2">{activeJob.error}</p>
                )}
              </div>
            )}

            <Button onClick={handleGenerateImage} disabled={!imagePrompt.trim() || (activeJob?.status === 'generating')}>
              Generate Image
            </Button>
          </div>
        )}

        {/* Voiceover Tab */}
        {activeTab === 'voiceover' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Text
              </label>
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Enter the text to convert to speech..."
                className="w-full p-3 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={5}
              />
            </div>

            {activeJob && (
              <div>
                <ProgressBar
                  progress={activeJob.progress || 0}
                  label="Generating voiceover..."
                />
                {activeJob.status === 'error' && (
                  <p className="text-red-400 text-sm mt-2">{activeJob.error}</p>
                )}
              </div>
            )}

            <Button onClick={handleGenerateVoiceover} disabled={!voiceText.trim() || (activeJob?.status === 'generating')}>
              Generate Voiceover
            </Button>
          </div>
        )}

        {/* Jobs List */}
        {allJobs.length > 0 && (
          <div className="mt-6 border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Jobs</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allJobs
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onRevealInAssets={(jobId) => {
                      const job = jobs.get(jobId);
                      if (job?.url) {
                        const asset = Array.from(assets.values()).find((a) => a.url === job.url);
                        if (asset) {
                          // Could scroll to asset bin or highlight
                          console.log('Reveal asset:', asset.id);
                        }
                      }
                    }}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
