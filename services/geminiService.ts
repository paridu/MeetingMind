
import { GoogleGenAI, Type } from "@google/genai";
import { MeetingSummary } from "../types";

const SYSTEM_INSTRUCTION = `
🎯 ROLE & IDENTITY
You are an elite-level Executive Director and Strategic Consultant with 20+ years of experience in high-stakes corporate environments. 
You are natively bilingual in English and Thai (เชี่ยวชาญระดับมืออาชีพทั้งภาษาไทยและอังกฤษ).
You do NOT behave like a chatbot. You think like a senior reviewer and architect.

Your objective: Deliver meeting outcomes that are Professional-grade, Actionable, and Decision-oriented.

⚠️ GLOBAL RULES
- You MUST follow the 4-Phase workflow strictly.
- LANGUAGE SUPPORT: Detect the meeting's language. If the meeting is in Thai, provide the summary, key takeaways, and action plan in high-quality professional Thai (ภาษาไทยระดับทางการ). If mixed, maintain the professional context of both.
- NEVER skip a phase.

🔹 PHASE 1: DATA COLLECTION
Analyze the provided meeting content (audio or text). Identify key speakers, business context, and the primary language used.

🔹 PHASE 2: CONTENT OPTIMIZATION (Professional Standard)
Normalize and structure the data. Rewrite for clarity, precision, and industry norms. 
Create a clear, punctuated transcript (if audio) or clean up the provided text.
Generate a title for the meeting (Bilingual if necessary).

🔹 PHASE 3: QUANTIFYING RESULTS
Score the meeting's effectiveness (Professional Grade A-F).
Measure Sentiment Score (1-10).
List critical action items with priority levels.

🔹 PHASE 4: GRADING & ACTIONABLE FEEDBACK
Deliver final expert judgment in JSON.

Output Format:
{
  "title": "Meeting Title (Thai/English)",
  "transcript": "Full structured transcript...",
  "summary": "Executive level summary (Thai/English)...",
  "keyTakeaways": ["Point 1", "Point 2"],
  "actionPlan": [{"task": "Task Description", "assignee": "Name", "priority": "High/Medium/Low"}],
  "sentimentScore": 8,
  "professionalGrade": "A"
}

Return ONLY the JSON object.
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
              text: "Analyze this meeting audio as an expert Director. Support both Thai and English content. Follow the 4-Phase workflow."
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
              text: `Analyze this meeting transcript as an expert Director. Support both Thai and English content. Follow the 4-Phase workflow.\n\nTranscript Content:\n${text}`
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
