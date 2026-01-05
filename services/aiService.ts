/// <reference types="vite/client" />
import { GeminiResponse } from "../types";

// This check helps us catch errors early
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

if (!API_KEY) {
  alert("CRITICAL ERROR: API Key is undefined. Check your .env file and Redeploy!");
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "google/gemini-2.0-flash-exp:free";
export const extractAndTranslate = async (
  base64Image: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  
  // 1. Safety check
  if (!API_KEY || API_KEY === "undefined") {
    throw new Error("API Key is missing. Check your .env file and redeploy.");
  }

  const prompt = `Act as a professional bilingual interpreter. 
  Extract all text from this image and translate it into ${targetLanguage}. 
  Provide cultural context and allergen info.
  RETURN ONLY A JSON OBJECT: { "items": [{ "originalText": "...", "translatedText": "...", "context": "...", "allergens": "..." }] }`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://savyasachi2605-hub.github.io/lenslingua-food-ocr/",
      "X-Title": "LensLingua Interpreter"
    },
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
      ],
      // This forces the AI to answer in JSON format
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter Error Details:", data);
    throw new Error(data.error?.message || "AI Service Error");
  }

  let content = data.choices[0].message.content;
  content = content.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(content) as GeminiResponse;
  } catch (e) {
    throw new Error("AI returned invalid JSON. Please try again.");
  }
};

/**
 * Audio Translation
 */
export const translateAudio = async (
  base64Audio: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  if (!API_KEY) throw new Error("API Key missing");

  const prompt = `Translate this audio into ${targetLanguage}. Return JSON with 'items' array.`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://savyasachi2605-hub.github.io/lenslingua-food-ocr/",
      "X-Title": "LensLingua"
    },
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
      ],
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Audio translation failed");

  let content = data.choices[0].message.content;
  content = content.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(content) as GeminiResponse;
};