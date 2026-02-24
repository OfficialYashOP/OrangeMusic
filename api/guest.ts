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

    try {
        const guestToken = "guest_" + Math.random().toString(36).substring(2, 15);

        return res.status(200).json({
            success: true,
            token: guestToken,
            user: { email: 'guest@orangemusic.app', role: 'guest' }
        });
    } catch (error: any) {
        console.error("Guest Login Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to authenticate guest' });
    }
}
