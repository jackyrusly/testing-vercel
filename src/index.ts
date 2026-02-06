import express from 'express';
import { GoogleGenAI } from "@google/genai";

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
    // const prompt = req.params.prompt;

    const prompt = req.body.prompt;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    }) as any;

    res.send(response.candidates[0].content.parts[0].text);
})

app.listen(process.env.PORT || 3000);

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default app
