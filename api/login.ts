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
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        // Extremely simple mock auth: Accept any email and password for now
        // since the user wants a "simple vercel backend auth" and no database is provided.
        const mockToken = "mock_token_" + Buffer.from(email).toString('base64');

        return res.status(200).json({
            success: true,
            token: mockToken,
            user: { email, role: 'user' }
        });
    } catch (error: any) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: error.message || 'Failed to authenticate' });
    }
}
