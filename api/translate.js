const translate = require('google-translate-api');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text, to } = req.query;

    if (!text || !to) {
        return res.status(400).json({ error: 'Please provide text and target language (to).' });
    }

    try {
        const result = await translate(text, { to });

        return res.status(200).json({
            original: text,
            translated: result.text,
            from: result.from.language.iso,
            to: to,
        });
    } catch (error) {
        console.error('Translation Error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch translation. Please try again later.' });
    }
};