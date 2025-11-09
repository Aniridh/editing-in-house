/**
 * Generate video thumbnails at 1fps (up to 10 frames)
 * Returns array of data URLs
 */
export async function generateVideoThumbnails(
  videoUrl: string,
  maxFrames: number = 10
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    // Only set crossOrigin for remote URLs (not blob/ObjectURLs)
    if (!videoUrl.startsWith('blob:') && !videoUrl.startsWith('data:')) {
      video.crossOrigin = 'anonymous';
    }
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const frameInterval = 1; // 1 second between frames
      const numFrames = Math.min(maxFrames, Math.floor(duration / frameInterval) + 1);
      const thumbnails: string[] = [];
      let framesLoaded = 0;

      // Create offscreen canvas for thumbnail generation
      const canvas = document.createElement('canvas');
      canvas.width = 160; // Thumbnail width
      canvas.height = 90; // Thumbnail height (16:9)
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const loadFrame = (frameIndex: number) => {
        const time = frameIndex * frameInterval;
        if (time >= duration) {
          resolve(thumbnails);
          return;
        }

        video.currentTime = time;

        video.onseeked = () => {
          // Draw video frame to canvas
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            thumbnails[frameIndex] = dataUrl;
            framesLoaded++;

            if (framesLoaded >= numFrames) {
              resolve(thumbnails.filter(Boolean));
            } else {
              loadFrame(frameIndex + 1);
            }
          }
        };

        video.onerror = () => {
          // Skip this frame and continue
          framesLoaded++;
          if (framesLoaded >= numFrames) {
            resolve(thumbnails.filter(Boolean));
          } else {
            loadFrame(frameIndex + 1);
          }
        };
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      loadFrame(0);
    };

    video.src = videoUrl;
  });
}

/**
 * Generate audio waveform data (downsampled RMS)
 * Returns array of normalized amplitude values (0-1)
 */
export async function generateAudioWaveform(
  audioUrl: string,
  samples: number = 200
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Handle blob/ObjectURLs differently
    if (audioUrl.startsWith('blob:') || audioUrl.startsWith('data:')) {
      // For local files, use fetch API
      fetch(audioUrl)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => processAudioBuffer(audioContext, arrayBuffer, samples, resolve, reject))
        .catch((error) => {
          audioContext.close();
          reject(error);
        });
      return;
    }
    
    const request = new XMLHttpRequest();
    request.open('GET', audioUrl, true);
    request.responseType = 'arraybuffer';

    request.onload = async () => {
      processAudioBuffer(audioContext, request.response, samples, resolve, reject);
    };

    request.onerror = () => {
      audioContext.close();
      reject(new Error('Failed to load audio'));
    };

    request.send();
  });
}

// Helper function to process audio buffer
async function processAudioBuffer(
  audioContext: AudioContext,
  arrayBuffer: ArrayBuffer,
  samples: number,
  resolve: (waveform: number[]) => void,
  reject: (error: Error) => void
) {
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const length = channelData.length;
    const blockSize = Math.floor(length / samples);
    const waveform: number[] = [];

    // Calculate RMS for each sample block
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, length);
      let sumSquares = 0;

      for (let j = start; j < end; j++) {
        sumSquares += channelData[j] * channelData[j];
      }

      const rms = Math.sqrt(sumSquares / (end - start));
      waveform.push(rms);
    }

    // Normalize to 0-1 range
    const max = Math.max(...waveform);
    if (max > 0) {
      for (let i = 0; i < waveform.length; i++) {
        waveform[i] = waveform[i] / max;
      }
    }

    audioContext.close();
    resolve(waveform);
  } catch (error) {
    audioContext.close();
    reject(error instanceof Error ? error : new Error('Failed to process audio'));
  }
}
