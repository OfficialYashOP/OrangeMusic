import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini from environment variable on Vercel
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: any, res: any) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    try {
        const { favorites } = req.body;

        if (!favorites || favorites.length === 0) {
            return res.status(200).json({ queries: [] });
        }

        const favNames = favorites.slice(0, 10).map((s: any) => `${s.name} by ${s.artists?.primary?.[0]?.name || ''}`).join(', ');

        const prompt = `
        You are an expert AI Music DJ. A user loves these songs: ${favNames}.
        Recommend exactly 5 completely different but similar vibe/genre Hindi or Bollywood songs they would love.
        Return ONLY a raw JSON array of strings (no markdown, no backticks, no other text).
        Example: ["Song Name 1", "Song Name 2"]
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');

        const queries = JSON.parse(responseText);
        return res.status(200).json({ queries });
    } catch (error: any) {
        console.error("Smart Mix Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to generate mix' });
    }
}
