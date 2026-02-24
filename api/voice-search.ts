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
        const { base64Audio, mimeType } = req.body;

        if (!base64Audio) {
            return res.status(400).json({ error: 'Missing audio data' });
        }

        const prompt = `
        You are a voice assistant in a music app. Listen to the user's voice command.
        Determine what kind of music, song, or artist they want to play.
        Return ONLY a raw JSON array with up to 5 song names or search queries that match their request.
        For example, if they say "Play some energetic Arijit Singh hits", return ["Arijit Singh energetic", "Arijit Singh dance", "Arijit Singh upbeat"].
        Do not include markdown or explanations. Just the JSON array of strings.
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType || 'audio/m4a',
                    data: base64Audio
                }
            }
        ]);

        const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
        const queries = JSON.parse(responseText);

        return res.status(200).json({ queries });
    } catch (error: any) {
        console.error("Voice AI Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to process voice' });
    }
}
