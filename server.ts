import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// Helper for retries with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const is503 = error.message?.includes("503") || error.status === 503 || error.code === 503;
      const isOverloaded = error.message?.includes("high demand") || error.message?.includes("overloaded");
      
      if (is503 || isOverloaded) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`Gemini 503/Busy. Attempt ${attempt + 1}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// API route for FlowTalk AI rewriting
app.post("/api/flowtalk/rewrite", async (req, res) => {
  const { input, tone, currentApp, sourceLanguage, targetLanguage } = req.body;

  if (!input) {
    return res.status(400).json({ error: "Input is required" });
  }

  try {
    const systemInstruction = `
      You are FlowTalk AI, a high-performance communication assistant.
      Your task is to transform natural, casual, or mixed-language thoughts into professional messages for apps like ${currentApp || 'Microsoft Teams'}.
      
      LANGUAGES:
      - Source: ${sourceLanguage && sourceLanguage !== 'Auto-detect' ? sourceLanguage : 'Detect automatically (Bengali, Hindi, Hinglish, Bengali-English mixed, Spanish, etc.).'}
      - Target: ${targetLanguage && targetLanguage !== 'Auto-detect' ? targetLanguage : 'Detect the input language and keep the output in the SAME language as the input, but polished and professional.'}
      
      TONE: "${tone || 'professional'}"
      - Casual: Friendly, concise, relaxed but polite.
      - Professional: Courteous, standard business language, clear and helpful.
      - Executive: High-level, formal, decisive, very professional.

      RULES:
      1. Rewrite the input into the target language matching the requested tone.
      2. If target is "Auto-detect" or not specified, stick to the language used in the input thought.
      3. If the input is empty or unclear, provide a polite placeholder or ask for more context subtly.
      4. Output ONLY the rewritten message. Do not include labels like "Rewritten:" or "Output:".
      5. Provide 3 short "Smart Suggestions" as variations or follow-ups, formatted as a JSON array at the end of the response, separated by a unique delimiter "|||JSON|||".
    `;

    const result = await withRetry(() => ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: input,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    }));

    const fullText = result.text || "";
    const [rewrittenText, jsonPart] = fullText.split("|||JSON|||");
    
    let suggestions = [];
    if (jsonPart) {
      try {
        suggestions = JSON.parse(jsonPart.trim());
      } catch (e) {
        console.error("Failed to parse suggestions JSON", e);
      }
    }

    res.json({ 
      output: rewrittenText.trim(),
      suggestions: suggestions.length > 0 ? suggestions : ["I'll share it shortly.", "Can I send it by EOD?", "The report is almost complete."]
    });
  } catch (error: any) {
    console.error("Gemini Final Error:", error);
    const isBusy = error.message?.includes("503") || error.status === 503 || error.message?.includes("high demand");
    res.status(isBusy ? 503 : 500).json({ 
      error: isBusy ? "The AI is currently receiving high demand. Please try again in a few moments." : (error.message || "Failed to process AI rewrite") 
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
