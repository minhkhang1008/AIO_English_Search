const jwt = require('jsonwebtoken');
const { getDb } = require('../lib/firebaseAdmin');

const JWT_SECRET = process.env.JWT_SECRET;

function getUserId(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
    const [k, ...v] = c.trim().split('=');
    return [k, v.join('=')];
  }));
  const token = cookies.session;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.uid;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const db = getDb();
  const userRef = db.collection('users').doc(userId);

  if (req.method === 'POST') {
    const newFavorites = req.body;
    if (!Array.isArray(newFavorites)) {
      return res.status(400).json({ message: 'Request body must be an array of favorites.' });
    }
    await userRef.update({ favorites: newFavorites, updatedAt: new Date().toISOString() });
    return res.status(200).json({ message: 'Favorites updated successfully.' });
  }

  if (req.method === 'GET') {
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json(doc.data().favorites || []);
  }

  return res.status(405).json({ message: 'Method not allowed.' });
}; 