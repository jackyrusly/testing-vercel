import express from 'express';
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_REST_URL!,
  token: process.env.REDIS_REST_TOKEN!,
});

type Message = {
  role: "user" | "model";
  parts: { text: string }[];
};

const INITIAL_CONTEXT = `
Kamu adalah chatbot khusus pertanian dan sayuran.

ATURAN WAJIB:
- Selalu jawab dalam Bahasa Indonesia.
- Topik HANYA tentang pertanian, sayuran, budidaya, pupuk, hama, penyakit tanaman, dan panen.
- Jika pertanyaan di luar topik tersebut, JANGAN menjawab pertanyaannya.
- Balasan penolakan:
"Maaf, saya hanya bisa membantu topik pertanian dan sayuran."
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
  console.log('bodyyy', req.body);
  let { conversationId, prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  if (!conversationId) {
    conversationId = crypto.randomUUID();
  }

  const history =
    (await redis.get<Message[]>(`chat:${conversationId}`)) ?? [
      {
        role: "user",
        parts: [{ text: INITIAL_CONTEXT }],
      },
    ];

  // add user message
  history.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  // 🔑 USE HISTORY HERE
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: history,
  });

  const reply =
    response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  history.push({
    role: "model",
    parts: [{ text: reply }],
  });

  // trim
  const MAX_MESSAGES = 20;
  const trimmedHistory =
    history.length > MAX_MESSAGES
      ? [history[0], ...history.slice(-MAX_MESSAGES)]
      : history;

  await redis.set(
    `chat:${conversationId}`,
    trimmedHistory,
    { ex: 60 * 60 * 24 }
  );

  res.json({
    conversationId,
    message: reply,
  });
});

app.listen(process.env.PORT || 3000);

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
