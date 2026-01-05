/// <reference types="vite/client" />
import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "google/gemma-3n-e2b-it:free"; 

export const extractAndTranslate = async (
  base64Image: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  
  // Debug: Check if key exists (Check your browser console)
  if (!API_KEY) {
    console.error("CRITICAL: API Key is missing from environment!");
    throw new Error("API Key configuration error. Check .env file.");
  }

  const prompt = `Return a JSON object with an 'items' array. Extract and translate the text from this image into ${targetLanguage}. 
  Format: { "items": [{ "originalText": "...", "translatedText": "...", "context": "...", "allergens": "..." }] }`;

  try {
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
      console.log("OpenRouter Detailed Error:", data); // Check console for this!
      throw new Error(data.error?.message || "User not found");
    }

    let content = data.choices[0].message.content;
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(content) as GeminiResponse;
  } catch (error: any) {
    console.error("Extraction Service Error:", error);
    throw error;
  }
};

export const translateAudio = async (
  base64Audio: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
    // Audio implementation using fetch... (similar structure as above)
    throw new Error("Audio not implemented in this debug version");
};