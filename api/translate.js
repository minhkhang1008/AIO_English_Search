export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text, to } = req.body; 

    if (!text || !to) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const response = await fetch('https://aio-english-search.vercel.app/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                to,
            }),
        });

        if (!response.ok) {
            throw new Error('Translation request failed');
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error during translation:', error);
        res.status(500).json({ error: 'Failed to translate text' });
    }
}