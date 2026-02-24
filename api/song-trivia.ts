import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: any, res: any) {
    // Enable CORS
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
        const { songName, artist } = req.body;

        if (!songName) {
            return res.status(400).json({ error: 'Missing song name' });
        }

        const prompt = `
        You are a music trivia expert. 
        Share 3-5 very interesting, mind-blowing, or obscure facts about the song "${songName}" by ${artist || 'Unknown Artist'}.
        Include facts about:
        - The production or recording process
        - Any records it broke
        - Meaning or inspiration behind specific lyrics
        - Covers or impact on pop culture
        
        Keep it concise, engaging, and in a bulleted list format.
        Return ONLY the facts, no introductory text.
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const trivia = result.response.text().trim();

        return res.status(200).json({ trivia });
    } catch (error: any) {
        console.error("Trivia AI Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to fetch trivia' });
    }
}
