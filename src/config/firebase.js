const admin = require('firebase-admin');
const config = require('./index');

if (config.firebase.privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
    databaseURL: config.firebase.databaseURL,
  });
} else {
  // Default to application default credentials (local dev, GCP, etc.)
  admin.initializeApp({
    projectId: config.firebase.projectId || 'eduz-dev',
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
