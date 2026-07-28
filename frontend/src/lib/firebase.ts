import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'almuerzos-dev',
  apiKey: 'AIzaSyDummyKeyForEmulator',
  authDomain: 'almuerzos-dev.firebaseapp.com',
  storageBucket: 'almuerzos-dev.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456',
};

const app = initializeApp(firebaseConfig);
let db: Firestore = getFirestore(app);

// Conectar a emulador si está disponible
const emulatorHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST;
if (emulatorHost) {
  const [host, port] = emulatorHost.split(':');
  connectFirestoreEmulator(db, host, parseInt(port));
  console.log(`Conectado a Firestore Emulator en ${emulatorHost}`);
} else {
  console.log('Usando Firestore en producción (GCP)');
}

export { app, db };
