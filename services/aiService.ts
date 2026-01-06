/// <reference types="vite/client" />
import { 
  GoogleGenerativeAI, 
  SchemaType as Type, 
} from "@google/generative-ai";
import { GeminiResponse } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(API_KEY);

// We will use this model for BOTH functions to stay on the newest quota bucket
const STABLE_MODEL = "gemini-2.5-flash"; 

export const extractAndTranslate = async (
  base64Image: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  
  const systemInstruction = `Act as a professional bilingual interpreter. Extract text and provide JSON.`;

  const model = genAI.getGenerativeModel({
    model: STABLE_MODEL, 
    systemInstruction,
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

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Image } },
    { text: `Translate this image into ${targetLanguage}.` }
  ]);

  const response = await result.response;
  let text = response.text();
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();

  return JSON.parse(text) as GeminiResponse;
};

export const translateAudio = async (
  base64Audio: string,
  mimeType: string,
  targetLanguage: string = 'English'
): Promise<GeminiResponse> => {
  
  // UPDATED: Now uses the same STABLE_MODEL as the image function
  const model = genAI.getGenerativeModel({
    model: STABLE_MODEL, 
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

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Audio } },
    { text: `Listen to this audio and translate it into ${targetLanguage}.` }
  ]);

  const response = await result.response;
  let text = response.text();
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();

  return JSON.parse(text) as GeminiResponse;
};