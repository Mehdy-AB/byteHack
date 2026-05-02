import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GOOGLE_GEMINI_API_KEY is not defined in environment variables. Gemini features will be disabled.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function explainTask(taskData: any) {
  if (!apiKey) throw new Error("Gemini API key missing");

  const prompt = `
    You are Mythos AI, an expert Security Orchestration and Response (SOAR) analyzer.
    Explain the following workflow task in detail for two specific stakeholders:
    1. **Administrator (Technical)**: Explain what is happening under the hood, security implications, and what to monitor.
    2. **HR / RH (Human Capital)**: Explain what skills or technical expertise an employee needs to have to manage or supervise this task.

    Task Details:
    - Type: ${taskData.task}
    - Step Order: ${taskData.order}
    - Status: ${taskData.status}
    - Execution Message: ${taskData.details}

    Format the response as JSON with "summary", "adminAnalysis", and "rhAnalysis" fields.
    Keep the tone professional, concise, and expert.
  `;

  const result = await geminiModel.generateContent(prompt);
  const response = await result.response;
  let text = response.text();
  
  // Clean up JSON if necessary (sometimes Gemini adds ```json blocks)
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  return JSON.parse(text);
}
