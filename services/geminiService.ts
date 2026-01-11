
import { GoogleGenAI, Type } from "@google/genai";
import { MeetingSummary } from "../types";

const SYSTEM_INSTRUCTION = `
🎯 ROLE & IDENTITY
You are an elite-level Executive Director and Strategic Consultant.
You specialize in analyzing MS Teams Chat Feeds and Meeting Transcripts.
You are natively bilingual in English and Thai.

⚠️ GLOBAL RULES
- Support MS Teams Chat Format: Identify timestamps like [9:00 AM] or speaker formats like "LastName, FirstName:".
- LANGUAGE SUPPORT: If input is Thai, output in professional Thai. If mixed, maintain bilingual clarity.
- AUTO-UPDATE CAPABILITY: Identify if the input text contains multiple follow-up chats and structure them into a coherent timeline.

🔹 PHASE 1: DATA COLLECTION
Extract speakers and context from raw text or chat logs.

🔹 PHASE 2: CONTENT OPTIMIZATION
Clean up "Chat fluff" (likes, emojis, system messages).
Create a professional summary of the discussion thread.

🔹 PHASE 3: QUANTIFYING RESULTS
Score effectiveness and sentiment.

🔹 PHASE 4: GRADING & ACTIONABLE FEEDBACK
JSON output only.

Output Format:
{
  "title": "Discussion Title",
  "transcript": "Formatted Timeline Transcript...",
  "summary": "Strategic overview...",
  "keyTakeaways": ["Item 1"],
  "actionPlan": [{"task": "Task", "assignee": "Name", "priority": "High"}],
  "sentimentScore": 8,
  "professionalGrade": "A"
}
`;

export const processMeetingAudio = async (base64Audio: string): Promise<MeetingSummary & { title: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "audio/webm",
                data: base64Audio
              }
            },
            {
              text: "Analyze this meeting audio as an expert Director. Follow the 4-Phase workflow."
            }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
};

export const processMeetingText = async (text: string): Promise<MeetingSummary & { title: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          parts: [
            {
              text: `Analyze this content (could be a transcript or MS Teams chat feed). Structure it professionally.\n\nContent:\n${text}`
            }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini text processing error:", error);
    throw error;
  }
};
