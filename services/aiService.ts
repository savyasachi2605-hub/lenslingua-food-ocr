/// <reference types="vite/client" />
import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_ID = "google/gemini-flash-1.5:free"; 

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
    if (start !== -1 && end !== -1) cleanContent = cleanContent.substring(start, end + 1);
    return JSON.parse(cleanContent) as GeminiResponse;
  } catch (e) {
    throw new Error("AI returned invalid data format.");
  }
};

export const extractAndTranslate = async (base64Image: string, mimeType: string, targetLanguage: string): Promise<GeminiResponse> => {
  const prompt = `Act as a professional interpreter. Extract text from this image and translate to ${targetLanguage}. Provide JSON with originalText, translatedText, context, and allergens.`;
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
        ]
      }],
      response_format: { type: "json_object" }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Vision Error");
  return parseAIResponse(data.choices[0].message.content);
};

export const translateAudio = async (base64Audio: string, mimeType: string, targetLanguage: string): Promise<GeminiResponse> => {
  // FIX: Extract the actual format (e.g., 'webm', 'mp4', 'wav') from the mimeType
  const audioFormat = mimeType.split('/')[1].split(';')[0]; 

  const prompt = `Act as a professional interpreter. Listen to this audio and translate it into ${targetLanguage}. Return a JSON object with an 'items' array.`;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "input_audio",
            input_audio: { 
              data: base64Audio, 
              format: audioFormat // Now correctly tells the AI it is 'webm' or 'mp4'
            }
          }
        ]
      }],
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Audio Error");
  return parseAIResponse(data.choices[0].message.content);
};