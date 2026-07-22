import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

const getGenAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy" });

// Simple rate limiter (in-memory, replace with Redis for production)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const data = rateLimit.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > data.resetTime) {
    data.count = 0;
    data.resetTime = now + windowMs;
  }

  if (data.count >= limit) return false;

  data.count++;
  rateLimit.set(key, data);
  return true;
}

export async function routeLLMRequest(
  provider: "gemini" | "openai",
  prompt: string,
  userId: string
) {
  if (!checkRateLimit(userId, 10, 60000)) {
    throw new Error("Rate limit exceeded");
  }

  // Cost tracking logic could go here (e.g., logging to Firestore)

  if (provider === "gemini") {
    const result = await getGenAI().models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    return result.text;
  } else {
    const completion = await getOpenAI().chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
    });
    return completion.choices[0].message.content;
  }
}
