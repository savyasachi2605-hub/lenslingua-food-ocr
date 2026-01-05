/// <reference types="vite/client" />
import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * CURRENT STABLE FREE VISION MODEL (JAN 2026)
 * If this fails, try: "nvidia/nemotron-nano-12b-2-vl:free"
 */
const MODEL_ID = "google/gemini-2.0-flash-exp:free";

const commonHeaders = {
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
  "HTTP-Referer": "https://savyasachi2605-hub.github.io/lenslingua-food-ocr/",
  "X-Title": "LensLingua Interpreter"
};

const parseAIResponse = (content: string): GeminiResponse => {
  try {
    let cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleanContent.indexOf('{');
    const end = cleanContent.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleanContent = cleanContent.substring(start, end + 1);
    }
    return JSON.parse(cleanContent) as GeminiResponse;
  } catch (e) {
    console.error("AI Response was not valid JSON:", content);
    throw new Error("AI response error. Please try again.");
  }
};

export const extractAndTranslate = async (
  base64Image: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  
  if (!API_KEY) throw new Error("API Key missing");

  const prompt = `Act as a professional bilingual interpreter. Extract all text from this image and translate it into ${targetLanguage}. Provide cultural context and allergen warnings. 
  IMPORTANT: Return ONLY a raw JSON object with this structure: {"items": [{"originalText": "...", "translatedText": "...", "context": "...", "allergens": "..."}]}`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` }
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("OpenRouter Error:", data);
    throw new Error(data.error?.message || "AI Provider busy. Try again in 1 minute.");
  }

  return parseAIResponse(data.choices[0].message.content);
};

export const translateAudio = async (
  base64Audio: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  
  const prompt = `Translate this audio into ${targetLanguage}. Return ONLY JSON with an 'items' array.`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "input_audio",
              input_audio: { data: base64Audio, format: "wav" }
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Audio provider error");

  return parseAIResponse(data.choices[0].message.content);
};