import { useState } from 'react';
import { interpret } from '../lib/api.js';
import type { Action } from '../types.js';

interface CommandPanelProps {
  onActionsReceived: (actions: Action[]) => void;
}

export function CommandPanel({ onActionsReceived }: CommandPanelProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const response = await interpret(text);
      onActionsReceived(response.actions);
      setText('');
    } catch (error) {
      console.error('Interpretation error:', error);
      onActionsReceived([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="command-panel p-4 border-b border-gray-300 bg-white">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a command... (e.g., '4s aerial night city, vertical, cinematic')"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

