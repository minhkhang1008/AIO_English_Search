export default function handler(req, res) {
    if (req.method === 'GET') {
        res.status(200).json({
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER,
            appId: process.env.FIREBASE_APP_ID
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}