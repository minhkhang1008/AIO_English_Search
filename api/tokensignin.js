import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: 'ID token is required' });
    }

    try {
        
        const ticket = await client.verifyIdToken({
            idToken,
            audience: CLIENT_ID, 
        });

        const payload = ticket.getPayload();

        const { name, email, picture } = payload;

        console.log('Google Payload:', payload);

        res.status(200).json({ name, email, picture });
    } catch (error) {
        console.error('Error verifying ID token:', error.message);
        res.status(500).json({ error: 'Failed to verify token', details: error.message });
    }
}