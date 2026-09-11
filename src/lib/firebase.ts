/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import config from '../../firebase-applet-config.json';

const projectId = (typeof process !== 'undefined' && process.env?.FIREBASE_PROJECT_ID) 
  || import.meta.env.VITE_FIREBASE_PROJECT_ID 
  || config.projectId 
  || 'soy-retina-0n50x-87d1d';

const authDomain = (typeof process !== 'undefined' && process.env?.FIREBASE_AUTH_DOMAIN) 
  || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN 
  || config.authDomain 
  || `${projectId}.firebaseapp.com`;

const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET 
  || config.storageBucket 
  || `${projectId}.firebasestorage.app`;

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || config.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || config.measurementId,
};

// Ensure Firebase is initialized only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, import.meta.env.VITE_FIRESTORE_DATABASE_ID || config.firestoreDatabaseId);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAIL = 'admin@prakritisoap.com';

export { 
  GoogleAuthProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile, 
  signOut, 
  onAuthStateChanged, 
  type User 
};
export { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy };
export { ref, uploadBytes, getDownloadURL };


