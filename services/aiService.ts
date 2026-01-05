/// <reference types="vite/client" />
import { GeminiResponse } from "../types";

// Ensure this matches your .env.local variable name
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "google/gemma-3-2b-it:free"; 

export const extractAndTranslate = async (
  base64Image: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  
  const prompt = `Act as a professional bilingual interpreter. 
  Extract text from this image and translate it to ${targetLanguage}. 
  Provide cultural context and allergen info.
  IMPORTANT: Return ONLY raw JSON in this format: 
  { "items": [{ "originalText": "...", "translatedText": "...", "context": "...", "allergens": "..." }] }`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "HTTP-Referer": window.location.origin, 
      "Content-Type": "application/json"
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
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "OpenRouter Error");
  }

  const data = await response.json();
  let content = data.choices[0].message.content;

  // Clean markdown if the model provides it
  content = content.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(content) as GeminiResponse;
  } catch (e) {
    console.error("Parse Error. Content was:", content);
    throw new Error("AI response format error. Try again.");
  }
};

export const translateAudio = async (
  base64Audio: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  // Note: If Gemma 3 2B Free doesn't support audio yet, this may return an error.
  const prompt = `Translate this audio into ${targetLanguage}. Return JSON with 'items' array.`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "Content-Type": "application/json"
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
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Audio failed");

  let content = data.choices[0].message.content;
  content = content.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(content) as GeminiResponse;
};