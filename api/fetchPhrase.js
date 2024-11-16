export default async function handler(req, res) {
    const { phrase, keyIndex } = req.query;

    if (!phrase) {
        return res.status(400).json({ error: 'Phrase is required' });
    }

    try {
        const uidList = [process.env.UID1, process.env.UID2, process.env.UID3, process.env.UID4];
        const tokenidList = [process.env.TOKENID1, process.env.TOKENID2, process.env.TOKENID3, process.env.TOKENID4];

        const index = parseInt(keyIndex, 10) - 1;
        const uid = uidList[index] || uidList[0];
        const tokenid = tokenidList[index] || tokenidList[0];

        const response = await fetch(`https://www.stands4.com/services/v2/phrases.php?uid=${uid}&tokenid=${tokenid}&phrase=${phrase}&format=json`);
        const data = await response.json();

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching phrase:', error);
        res.status(500).json({ error: 'Failed to fetch phrase' });
    }
}