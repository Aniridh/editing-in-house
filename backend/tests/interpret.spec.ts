import { describe, it, expect, vi, beforeEach } from 'vitest';
import { interpret } from '../src/lib/interpret.js';
import { InterpretResponseSchema, ActionSchema } from '../src/types.js';

// Mock the Gemini API
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn(),
      }),
    })),
  };
});

describe('interpret', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.LLM_PROVIDER = 'gemini';
  });

  it('should return valid actions for generate_clip command', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            actions: [{
              type: 'generate_clip',
              prompt: 'aerial night city, cinematic',
              duration_sec: 4,
              aspect: '9:16',
            }],
          }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('4s aerial night city, vertical, cinematic');
    
    expect(result).toHaveProperty('actions');
    expect(Array.isArray(result.actions)).toBe(true);
    expect(result.actions.length).toBeGreaterThan(0);
    
    // Validate with Zod
    const validated = InterpretResponseSchema.parse(result);
    expect(validated.actions[0].type).toBe('generate_clip');
  });

  it('should return valid actions for insert command', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            actions: [
              {
                type: 'generate_clip',
                prompt: 'skyline b-roll',
                duration_sec: 3,
              },
              {
                type: 'insert',
                asset_id: '<generated>',
                track: 'video',
                at: 5,
              },
            ],
          }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('Insert at 5s a 3s skyline b-roll');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions.length).toBe(2);
    
    // Validate with Zod
    const validated = InterpretResponseSchema.parse(result);
    expect(validated.actions[0].type).toBe('generate_clip');
    expect(validated.actions[1].type).toBe('insert');
    expect(validated.actions[1].track).toBe('video');
    expect(validated.actions[1].at).toBe(5);
  });

  it('should return valid actions for trim command', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            actions: [{
              type: 'trim',
              clip_id: 'clip-123',
              start: 2,
              end: 8,
            }],
          }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('Trim clip from 2s to 8s');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions.length).toBe(1);
    
    // Validate with Zod
    const validated = InterpretResponseSchema.parse(result);
    expect(validated.actions[0].type).toBe('trim');
    expect(validated.actions[0].start).toBe(2);
    expect(validated.actions[0].end).toBe(8);
  });

  it('should return empty actions for invalid JSON', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'This is not valid JSON at all',
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('some command');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions).toEqual([]);
    
    // Should still validate with Zod
    const validated = InterpretResponseSchema.parse(result);
    expect(validated.actions).toEqual([]);
  });

  it('should return empty actions for malformed JSON structure', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({ wrong: 'structure' }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('some command');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions).toEqual([]);
  });

  it('should return empty actions for invalid action types', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            actions: [{
              type: 'invalid_action_type',
              prompt: 'test',
            }],
          }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('some command');
    
    // Invalid actions should be filtered out
    expect(result).toHaveProperty('actions');
    expect(result.actions).toEqual([]);
  });

  it('should handle markdown code blocks in response', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => '```json\n{"actions":[{"type":"generate_clip","prompt":"test","duration_sec":5}]}\n```',
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('generate 5s test video');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions.length).toBe(1);
    
    const validated = InterpretResponseSchema.parse(result);
    expect(validated.actions[0].type).toBe('generate_clip');
  });

  it('should return empty actions when API key is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    
    const result = await interpret('some command');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions).toEqual([]);
  });

  it('should handle API errors gracefully', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockRejectedValue(new Error('API Error')),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('some command');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions).toEqual([]);
  });

  it('should validate multiple action types correctly', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            actions: [
              { type: 'generate_clip', prompt: 'test', duration_sec: 3 },
              { type: 'set_caption', text: 'Hello', start: 0, end: 2 },
              { type: 'set_aspect', aspect: '16:9' },
            ],
          }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('generate clip, add caption, set aspect');
    
    expect(result.actions.length).toBe(3);
    
    const validated = InterpretResponseSchema.parse(result);
    expect(validated.actions[0].type).toBe('generate_clip');
    expect(validated.actions[1].type).toBe('set_caption');
    expect(validated.actions[2].type).toBe('set_aspect');
  });

  it('should filter out invalid actions but keep valid ones', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            actions: [
              { type: 'generate_clip', prompt: 'test', duration_sec: 3 },
              { type: 'invalid_type', prompt: 'bad' },
              { type: 'set_aspect', aspect: '16:9' },
            ],
          }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('some command');
    
    // Should have 2 valid actions, invalid one filtered out
    expect(result.actions.length).toBe(2);
    expect(result.actions[0].type).toBe('generate_clip');
    expect(result.actions[1].type).toBe('set_aspect');
  });

  it('should handle empty actions array', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({ actions: [] }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('unclear command');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions).toEqual([]);
    
    const validated = InterpretResponseSchema.parse(result);
    expect(validated.actions).toEqual([]);
  });

  it('should handle missing required fields in actions', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            actions: [
              { type: 'generate_clip' }, // Missing required 'prompt'
              { type: 'trim', clip_id: 'test' }, // Missing required 'start' and 'end'
            ],
          }),
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('some command');
    
    // Invalid actions should be filtered out
    expect(result.actions).toEqual([]);
  });

  it('should handle partial JSON parse errors', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => '{"actions":[{', // Incomplete JSON
        },
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue(mockModel),
    }));

    const result = await interpret('some command');
    
    expect(result).toHaveProperty('actions');
    expect(result.actions).toEqual([]);
  });
});

