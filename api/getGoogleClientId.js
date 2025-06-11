export default function handler(req, res) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
        return res.status(500).json({ error: 'Google Client ID is not defined in environment variables' });
    }

    res.status(200).json({ googleClientId });
}ư