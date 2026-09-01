/**
 * SiliconLabs Shared Gemini Vision API Client
 * 
 * Single source of truth for model name, API key, and the low-level
 * fetch+parse call. Both the Digitizer (geminiOcr.ts) and the
 * Deconstructor (designDeconstructor.ts) call through this helper,
 * so the model endpoint is never duplicated.
 */

// =====================================================================
// CONFIGURATION — single source of truth
// =====================================================================

export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const DEFAULT_GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

/**
 * Resolves the active API key from (in priority order):
 * 1. Explicit customApiKey parameter
 * 2. localStorage setting
 * 3. Built-in default key
 */
export function resolveApiKey(customApiKey?: string): string {
  return customApiKey?.trim() || localStorage.getItem('sl_gemini_api_key')?.trim() || DEFAULT_GEMINI_API_KEY;
}

/**
 * Builds the full Gemini generateContent endpoint URL.
 */
export function getGeminiEndpoint(apiKey: string): string {
  return `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

/**
 * Extracts base64 payload and mime type from a data URL.
 */
export function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64Data: match[2] };
  }
  return { mimeType: 'image/jpeg', base64Data: dataUrl };
}

/**
 * Strips markdown code fences from Gemini's response.
 * Gemini's structured JSON output sometimes arrives wrapped in ```json ... ``` fences.
 */
export function stripJsonFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*\n?/, '');
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}

/**
 * Core Gemini Vision API call — sends an image with a text prompt and returns
 * the raw text response from Gemini.
 * 
 * Both the Digitizer and Deconstructor call this with their own prompts.
 * The model name, API key resolution, and fetch logic live here once.
 * 
 * @throws Error on HTTP failure or empty response
 */
export async function callGeminiVision(
  prompt: string,
  base64Data: string,
  mimeType: string,
  customApiKey?: string
): Promise<string> {
  const apiKey = resolveApiKey(customApiKey);
  const url = getGeminiEndpoint(apiKey);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini Vision API error (Status ${response.status}): ${errorBody}`);
  }

  const resultData = await response.json();
  const textOutput = resultData.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('Gemini Vision API returned empty text candidate.');
  }

  return textOutput;
}
