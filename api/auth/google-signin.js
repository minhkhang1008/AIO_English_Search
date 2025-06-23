const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { getDb } = require('../../lib/firebaseAdmin');

const GOOGLE_CLIENT_ID = '628893449247-lqos18hss794hks767eht0abnpceavc8.apps.googleusercontent.com';
const JWT_SECRET = process.env.JWT_SECRET;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed.' });
  }

  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required.' });

    // Verify ID token
    const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleId = payload.sub;

    const db = getDb();
    const userRef = db.collection('users').doc(googleId);
    let userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        fullName: payload.name,
        picture: payload.picture,
        favorites: [],
        updatedAt: new Date().toISOString(),
      });
      userDoc = await userRef.get();
    } else {
      // Update profile info if changed
      const data = userDoc.data();
      if (data.fullName !== payload.name || data.picture !== payload.picture) {
        await userRef.update({ fullName: payload.name, picture: payload.picture, updatedAt: new Date().toISOString() });
      }
    }

    const userData = (await userRef.get()).data();

    // Issue session cookie
    const sessionToken = jwt.sign({ uid: googleId }, JWT_SECRET, { expiresIn: '7d' });
    res.setHeader('Set-Cookie', `session=${sessionToken}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`);

    return res.status(200).json({
      id: googleId,
      fullName: userData.fullName,
      picture: userData.picture,
      favorites: userData.favorites || [],
    });
  } catch (err) {
    console.error('Error in Google Sign-In backend:', err);
    return res.status(401).json({ message: 'Authentication failed.' });
  }
};

module.exports = handler; 