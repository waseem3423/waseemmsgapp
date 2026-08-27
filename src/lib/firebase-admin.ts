import admin from 'firebase-admin';

// This is the only way to check if the app is initialized in a server environment
if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
        ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
        : '';
        
    if (serviceAccountString) {
        // The private_key in the service account JSON contains literal \n characters.
        // When this is stringified and then base64 encoded, these can become \\n.
        // JSON.parse needs them to be literal \n characters again.
        const serviceAccount = JSON.parse(serviceAccountString);
        
        // If the private key still has issues, you might need to un-escape it:
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
    } else {
        console.warn("Firebase Admin not initialized. Service account environment variable is missing or empty.");
    }

  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminMessaging = admin.apps.length ? admin.messaging() : null;
