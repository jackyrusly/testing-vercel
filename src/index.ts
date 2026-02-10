import express from 'express';
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

type Message = {
  role: "system" | "user" | "assistant";
  parts: { text: string }[];
};

const conversations = new Map<string, Message[]>();

const SYSTEM_CONTEXT = `
Kamu adalah chatbot pertanian.
Aturan wajib:
- Selalu jawab menggunakan Bahasa Indonesia.
- Topik hanya tentang pertanian, sayuran, budidaya, pupuk, hama, panen, dan perawatan tanaman.
- Jika pertanyaan di luar topik tersebut, tolak dengan sopan dan arahkan kembali ke pertanian.
- Jawaban harus singkat, jelas, dan praktis.
`;

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY
});

const app = express();

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/', async (req, res) => {
  console.log(req.body);
  let { conversationId, prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  // Generate conversationId if missing
  if (!conversationId) {
    conversationId = crypto.randomUUID();
  }

  const history =
    conversations.get(conversationId) ?? [
      {
        role: "system",
        parts: [{ text: SYSTEM_CONTEXT }],
      },
    ];

  // Add user message
  history.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  }) as any;

  const reply =
    response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Save assistant reply
  history.push({
    role: "assistant",
    parts: [{ text: reply }],
  });


  // Trim history
  const MAX_MESSAGES = 20;
  conversations.set(conversationId, history.slice(-MAX_MESSAGES));

  res.json({
    conversationId,
    message: reply,
  });
})

app.listen(process.env.PORT || 3000);

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
