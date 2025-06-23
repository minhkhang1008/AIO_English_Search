module.exports = (req, res) => {
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
  res.status(200).json({ message: 'Signed out successfully.' });
}; 