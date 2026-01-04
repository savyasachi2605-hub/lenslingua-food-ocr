/// <reference types="vite/client" />
/* Updated: Jan 2026 - Stable Version */
import { 
  GoogleGenerativeAI, 
  SchemaType as Type, 
} from "@google/generative-ai";
import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(API_KEY);

export const extractAndTranslate = async (
  base64Image: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  
  const systemInstruction = `
    Act as a professional bilingual interpreter and cultural guide. 
    Extract all text found in the provided image.
    Provide the response in JSON format.
  `;

  // Standard stable model for 2026
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash", 
    systemInstruction,
  });

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        { text: `Extract text, translate to ${targetLanguage}, provide cultural context, and identify allergens.` },
      ],
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalText: { type: Type.STRING },
                translatedText: { type: Type.STRING },
                context: { type: Type.STRING },
                allergens: { type: Type.STRING },
              },
              required: ["originalText", "translatedText", "context", "allergens"],
            },
          },
        },
        required: ["items"],
      }
    }
  });

  const response = await result.response;
  const text = response.text();

  try {
    return JSON.parse(text) as GeminiResponse;
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("Received malformed data. Please try again.");
  }
};

export const translateAudio = async (
  base64Audio: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash", 
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    },
    { text: `Translate this audio into ${targetLanguage}. Provide JSON with originalText, translatedText, context, and allergens.` },
  ]);

  const response = await result.response;
  const text = response.text();

  try {
    return JSON.parse(text) as GeminiResponse;
  } catch (e) {
    throw new Error("Failed to interpret audio.");
  }
};