import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { interpretCommand } from '../../api/interpret';
import { Button } from '../UI/Button';
import type { Action } from '../../types';

interface CommandHint {
  label: string;
  prompt: string;
}

const COMMAND_HINTS: CommandHint[] = [
  {
    label: 'Generate Video',
    prompt: 'generate video of a sunset over the ocean, 5 seconds',
  },
  {
    label: 'Generate Image',
    prompt: 'generate image of a mountain landscape',
  },
  {
    label: 'Set Aspect Ratio',
    prompt: 'set aspect ratio to 9:16',
  },
];

export function CommandPanel() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [clarification, setClarification] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);

  const demoMode = false; // TODO: Add demo mode toggle
  const addAsset = useEditorStore((state) => state.addAsset);
  const insertClip = useEditorStore((state) => state.insertClip);
  const tracks = useEditorStore((state) => state.tracks);
  const playhead = useEditorStore((state) => state.playhead);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setActions([]);
    setClarification(null);
    setShowHints(false);

    try {
      const interpretedActions = await interpretCommand(prompt, demoMode);

      if (interpretedActions.length === 0) {
        setShowHints(true);
        setClarification(
          "I couldn't understand that command. Try one of the suggestions below:"
        );
        setIsLoading(false);
        return;
      }

      setShowHints(false);
      setActions(interpretedActions);

      // Execute actions
      for (const action of interpretedActions) {
        await executeAction(action);
      }

      setPrompt('');
    } catch (error) {
      console.error('Interpret error:', error);
      setClarification('Failed to interpret command. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (action: Action) => {
    switch (action.type) {
      case 'generate_clip':
      case 'generate_image':
      case 'generate_voiceover':
        // These should be handled by GeneratorPanel
        // For now, we'll just show a message
        console.log('Generation action:', action);
        break;
      case 'insert':
        // Insert clip at playhead
        const track = tracks.find((t) => t.type === action.track || t.type === 'video');
        if (track && action.asset_id) {
          const asset = useEditorStore.getState().assets.get(action.asset_id);
          if (asset) {
            const clip = {
              id: `clip-${Date.now()}`,
              assetId: action.asset_id,
              trackId: track.id,
              start: action.at || playhead,
              end: (action.at || playhead) + (asset.duration || 5),
              inPoint: 0,
              outPoint: asset.duration || 5,
            };
            insertClip(clip);
          }
        }
        break;
      case 'set_aspect':
        useEditorStore.getState().setAspectRatio(action.aspect);
        break;
      default:
        console.log('Unhandled action:', action);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Command</h2>
        <p className="text-sm text-gray-400 mt-1">Type or speak your command</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'generate video of a sunset over the ocean, 5 seconds, vertical'"
          className="flex-1 w-full p-3 bg-gray-800 text-white rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={isLoading}
          aria-label="Command input"
        />

        {clarification && (
          <div className="mt-2 p-2 bg-yellow-900/50 border border-yellow-700 rounded text-sm text-yellow-200">
            {clarification}
          </div>
        )}

        {showHints && actions.length === 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              Try these commands:
            </div>
            <div className="flex flex-wrap gap-2">
              {COMMAND_HINTS.map((hint, index) => (
                <button
                  key={index}
                  onClick={async () => {
                    setPrompt(hint.prompt);
                    setShowHints(false);
                    // Auto-submit
                    setIsLoading(true);
                    try {
                      const interpretedActions = await interpretCommand(hint.prompt, demoMode);
                      if (interpretedActions.length > 0) {
                        setActions(interpretedActions);
                        for (const action of interpretedActions) {
                          await executeAction(action);
                        }
                        setPrompt('');
                      }
                    } catch (error) {
                      console.error('Interpret error:', error);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors"
                >
                  {hint.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="mt-2 p-2 bg-gray-800 rounded text-sm text-gray-300">
            <div className="font-semibold mb-1">Actions:</div>
            <ul className="list-disc list-inside space-y-1">
              {actions.map((action, i) => (
                <li key={i}>{action.type}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="mt-4 w-full"
        >
          {isLoading ? 'Processing...' : 'Execute'}
        </Button>
      </form>
    </div>
  );
}
