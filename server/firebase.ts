import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// Make sure to set the GOOGLE_APPLICATION_CREDENTIALS environment variable
// or other Firebase config environment variables.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

export const auth = admin.auth();
