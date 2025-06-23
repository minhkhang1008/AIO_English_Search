const admin = require('firebase-admin');

let app;

function getFirebaseApp() {
  if (!app) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT env var not set');
    }
    const credential = admin.credential.cert(JSON.parse(serviceAccountJson));
    app = admin.initializeApp({ credential });
  }
  return app;
}

function getDb() {
  return getFirebaseApp().firestore();
}

module.exports = { getDb }; 