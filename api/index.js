const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { input } = req.body;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: `What does '${input}' mean?` }],
                max_tokens: 100
            })
        });
        const data = await response.json();
        res.status(200).json(data.choices[0].message.content);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error fetching response from OpenAI." });
    }
};
