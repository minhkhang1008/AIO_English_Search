
const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { input } = req.body;

    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5-16k:generateText", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GEMINI_API_KEY}`
            },
            body: JSON.stringify({
                prompt: { text: `Define the term: ${input}` },
                temperature: 0.7,
                maxOutputTokens: 100
            })
        });
        const data = await response.json();
        res.status(200).json(data.candidates[0].output);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error fetching response from Gemini API." });
    }
};
