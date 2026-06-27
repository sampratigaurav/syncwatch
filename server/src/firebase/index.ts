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
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
      } catch (parseError) {
        console.error('❌ FATAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Make sure you pasted valid JSON without mangled quotes or missing braces!', parseError);
        throw parseError;
      }
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
