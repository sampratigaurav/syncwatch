import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.replace(/^["']|["']$/g, '');
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const databaseURL = process.env.FIREBASE_DATABASE_URL?.replace(/^["']|["']$/g, '');

if ((serviceAccountPath || serviceAccountJson) && databaseURL) {
  try {
    let serviceAccount;
    if (serviceAccountJson) {
      serviceAccount = JSON.parse(serviceAccountJson);
    } else {
      serviceAccount = require(path.resolve(serviceAccountPath!));
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: databaseURL
    });
    console.log('✅ Firebase Admin SDK initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', err);
  }
} else {
  console.log('⚠️ Firebase credentials not found. Authentication features disabled.');
}

export const firebaseAdmin = admin;
export const db = admin.apps.length ? admin.firestore() : null;
export const rtdb = admin.apps.length ? admin.database() : null;
export const auth = admin.apps.length ? admin.auth() : null;
