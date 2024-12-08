import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

export default async function handler(req, res) {
    // Set headers to resolve COOP and CORS warnings
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Ensure the request body contains the ID token
    if (!req.body || !req.body.idToken) {
        return res.status(400).json({ error: 'ID token is required' });
    }

    const { idToken } = req.body;

    try {
        // Verify the Google ID token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: CLIENT_ID, // Match the Google Client ID
        });

        // Extract user information from the token payload
        const payload = ticket.getPayload();
        const { name, email, picture } = payload;

        console.log('Google Payload:', payload); // Log for debugging

        // Respond with the user's information
        res.status(200).json({ name, email, picture });
    } catch (error) {
        console.error('Error verifying ID token:', error.message);
        res.status(500).json({ error: 'Failed to verify token', details: error.message });
    }
}