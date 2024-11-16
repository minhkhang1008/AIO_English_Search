export default async function handler(req, res) {
    const { phrase } = req.query;

    if (!phrase) {
        return res.status(400).json({ error: 'Phrase is required' });
    }

    try {
        const uid = process.env.UID;
        const tokenid = process.env.TOKENID;

        const response = await fetch(`https://www.stands4.com/services/v2/phrases.php?uid=${uid}&tokenid=${tokenid}&phrase=${phrase}&format=json`);
        const data = await response.json();

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching phrase:', error);
        res.status(500).json({ error: 'Failed to fetch phrase' });
    }
}