
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GeminiResponse } from "../types";

export const extractAndTranslate = async (
  base64Image: string, 
  mimeType: string, 
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    Act as a professional bilingual interpreter and cultural guide. 
    Extract all text found in the provided image.
    For each distinct text element, provide:
    1. verbatim transcription in its original language.
    2. a natural, idiomatic translation into ${targetLanguage}.
    3. 'context': Cultural nuances, slang, or intent explanations.
    4. 'allergens': If the item is food-related, explicitly list any identified or potential allergens (peanuts, dairy, soy, gluten, etc.). If none or not food, leave as an empty string.
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        { text: "Analyze this image. Extract text, translate it, provide cultural context, and identify allergens." },
      ],
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalText: { type: Type.STRING, description: "Verbatim transcription" },
                translatedText: { type: Type.STRING, description: "Translation into target language" },
                context: { type: Type.STRING, description: "Cultural context and intent" },
                allergens: { type: Type.STRING, description: "Allergen warnings if applicable" },
              },
              required: ["originalText", "translatedText", "context", "allergens"],
            },
          },
        },
        required: ["items"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No text received from Gemini API");
  }

  try {
    return JSON.parse(text) as GeminiResponse;
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON:", text);
    throw new Error("Received malformed data from AI. Please try a clearer photo.");
  }
};

export const translateAudio = async (
  base64Audio: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    Act as a professional bilingual interpreter for a traveler. 
    Listen to this audio.
    Provide:
    1. verbatim transcription.
    2. idiomatic translation into ${targetLanguage}.
    3. 'context': Tone, slang, or cultural nuances.
    4. 'allergens': If food items are mentioned, list any allergens discussed.
  `;

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        { text: "Listen to this audio and provide the translation, context, and any mentioned allergens." },
      ],
    },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalText: { type: Type.STRING, description: "Verbatim transcription" },
                translatedText: { type: Type.STRING, description: "Translation into target language" },
                context: { type: Type.STRING, description: "Cultural Insight" },
                allergens: { type: Type.STRING, description: "Mentioned allergen info" },
              },
              required: ["originalText", "translatedText", "context", "allergens"],
            },
          },
        },
        required: ["items"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No translation received from Gemini API");
  }

  try {
    return JSON.parse(text) as GeminiResponse;
  } catch (e) {
    console.error("Failed to parse Gemini response as JSON:", text);
    throw new Error("Failed to interpret audio. Please speak more clearly or try again.");
  }
};
