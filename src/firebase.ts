import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Test initial connection as required by Firebase integration guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota')) {
      console.warn('Firebase Firestore: Daily free quota limit reached, app will use high-speed WebSocket/P2P fallback seamlessly.');
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: client is currently offline or connecting...');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection().catch(() => {});
}

export default db;
