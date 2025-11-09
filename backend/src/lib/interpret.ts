import { GoogleGenerativeAI } from '@google/generative-ai';
import { Action, ActionSchema, InterpretResponse } from '../types.js';
import { logger } from './logger.js';

const SYSTEM_PROMPT = `You are a video editing assistant. Convert natural language commands into strict JSON.

REQUIRED OUTPUT FORMAT (exact schema):
{
  "actions": [
    {
      "type": "generate_clip" | "generate_image" | "generate_voiceover" | "insert" | "trim" | "split" | "move" | "delete" | "set_aspect" | "set_caption" | "set_music" | "render" | "clarify",
      ...action-specific fields
    }
  ]
}

ACTION SCHEMAS:
- generate_clip: { "type": "generate_clip", "prompt": string, "duration_sec"?: number, "aspect"?: string, "style"?: string }
- generate_image: { "type": "generate_image", "prompt": string, "aspect"?: string, "style"?: string }
- generate_voiceover: { "type": "generate_voiceover", "text": string, "voice"?: string }
- insert: { "type": "insert", "asset_id": string, "track": "video" | "overlay" | "audio", "at": number }
- trim: { "type": "trim", "clip_id": string, "start": number, "end": number }
- split: { "type": "split", "clip_id": string, "at": number }
- move: { "type": "move", "clip_id": string, "to": number }
- delete: { "type": "delete", "clip_id": string }
- set_aspect: { "type": "set_aspect", "aspect": string }
- set_caption: { "type": "set_caption", "text": string, "start": number, "end": number, "track"?: "overlay" }
- set_music: { "type": "set_music", "url"?: string, "volume"?: number }
- render: { "type": "render", "format"?: string }
- clarify: { "type": "clarify", "params": { "question": string } }

RULES:
1. Return ONLY valid JSON. No markdown, no code blocks, no explanations.
2. If command is unclear, ambiguous, or missing critical information, return a SINGLE clarify action with the most helpful question to resolve the ambiguity.
3. NEVER return empty actions array. If uncertain, use clarify action.
4. Infer defaults when reasonable: duration ≤5s if not specified, aspect "16:9" unless "vertical" (→ "9:16"), "horizontal" (→ "16:9"), or "square" (→ "1:1")
5. Extract numeric values from natural language (seconds, positions)
6. When asking for clarification, ask ONE specific question that would help most (e.g., "What duration should the clip be?", "Which clip should I trim?", "What aspect ratio do you want?")

EXAMPLES:

Input: "4s aerial night city, vertical, cinematic"
Output: {"actions":[{"type":"generate_clip","prompt":"aerial night city, cinematic","duration_sec":4,"aspect":"9:16"}]}

Input: "Insert at 5s a 3s skyline b-roll"
Output: {"actions":[{"type":"generate_clip","prompt":"skyline b-roll","duration_sec":3},{"type":"insert","asset_id":"<generated>","track":"video","at":5}]}

Input: "Trim clip from 2s to 8s"
Output: {"actions":[{"type":"trim","clip_id":"<clip_id>","start":2,"end":8}]}

Input: "make a video"
Output: {"actions":[{"type":"clarify","params":{"question":"What should the video be about? Please describe the scene or content."}}]}

Input: "trim it"
Output: {"actions":[{"type":"clarify","params":{"question":"Which clip should I trim? Please specify the clip ID or describe the clip."}}]}

Return ONLY the JSON object. No other text.`;

async function interpretWithGemini(text: string): Promise<InterpretResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('GEMINI_API_KEY not set');
    // Return clarify action instead of empty actions
    return { 
      actions: [{ 
        type: 'clarify', 
        params: { 
          question: 'The system is not properly configured. Please contact support.' 
        } 
      }] 
    };
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const prompt = `${SYSTEM_PROMPT}\n\nUser command: "${text}"\n\nJSON response:`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text().trim();

    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // Try to find JSON object directly
      const objectMatch = responseText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);
    
    // Validate the full InterpretResponse schema
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.actions)) {
      logger.warn({ parsed }, 'Invalid response structure from Gemini');
      // Return clarify action instead of empty actions
      return { 
        actions: [{ 
          type: 'clarify', 
          params: { 
            question: 'Could you rephrase your request? I didn\'t understand that command.' 
          } 
        }] 
      };
    }
    
    // Validate each action with Zod
    const validatedActions: Action[] = [];
    for (const action of parsed.actions) {
      try {
        const validated = ActionSchema.parse(action);
        validatedActions.push(validated);
      } catch (validationError) {
        logger.warn({ action, error: validationError }, 'Invalid action in response, skipping');
        // Skip invalid actions but continue processing others
      }
    }
    
    // If no valid actions after validation, return clarify action
    // This handles cases where LLM returns empty array or all actions are invalid
    if (validatedActions.length === 0) {
      return { 
        actions: [{ 
          type: 'clarify', 
          params: { 
            question: 'Could you provide more details about what you\'d like to do?' 
          } 
        }] 
      };
    }
    
    return { actions: validatedActions };
  } catch (error) {
    // Catch JSON parse errors, validation errors, or any other errors
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Gemini interpretation failed');
    // Return clarify action instead of empty actions
    return { 
      actions: [{ 
        type: 'clarify', 
        params: { 
          question: 'I encountered an error processing your request. Could you try rephrasing it?' 
        } 
      }] 
    };
  }
}

async function interpretWithOpenAI(text: string): Promise<InterpretResponse> {
  // Stub for future OpenAI integration
  logger.warn('OpenAI interpretation not yet implemented');
  return { actions: [] };
}

export async function interpret(text: string): Promise<InterpretResponse> {
  const provider = process.env.LLM_PROVIDER || 'gemini';
  
  if (provider === 'gemini') {
    return interpretWithGemini(text);
  } else if (provider === 'openai') {
    return interpretWithOpenAI(text);
  } else {
    logger.warn({ provider }, 'Unknown LLM provider, defaulting to empty actions');
    return { actions: [] };
  }
}

