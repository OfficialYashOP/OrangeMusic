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
        const { songName, artist, lyrics } = req.body;

        if (!songName) {
            return res.status(400).json({ error: 'Missing song name' });
        }

        const lyricsContext = lyrics ? `Here are the lyrics for context:\n\n${lyrics}\n\n` : '';

        const prompt = `
        You are a highly knowledgeable music historian and lyricist.
        Explain the profound meaning, backstory, vibe, or poetic translation of the song "${songName}" by ${artist || 'Unknown Artist'}.
        ${lyricsContext}
        Keep the explanation engaging, profound, but concise (around 3 to 4 short paragraphs). 
        Format your response beautifully in standard text, highlighting the mood, interesting trivia, and the underlying meaning of the song.
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent(prompt);
        const explanation = result.response.text().trim();

        return res.status(200).json({ explanation });
    } catch (error: any) {
        console.error("Lyrics AI Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to explain lyrics' });
    }
}
