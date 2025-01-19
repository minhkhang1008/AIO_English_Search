export default function handler(req, res) {
    const domain = process.env.AUTH0_DOMAIN;
    const clientId = process.env.AUTH0_CLIENT_ID;
  
    if (!domain || !clientId) {
      return res.status(500).json({ error: "Auth0 credentials are not configured." });
    }
  
    res.status(200).json({
      domain,
      clientId,
    });
  }