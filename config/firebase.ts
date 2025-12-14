import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const validateConfig = () => {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingKeys = requiredKeys.filter(
    (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
  );

  if (missingKeys.length > 0) {
    console.warn(
      '⚠️ Missing Firebase configuration keys:',
      missingKeys.join(', '),
      '\nPlease check your .env file and ensure all EXPO_PUBLIC_FIREBASE_* variables are set.'
    );
  }
};

// Validate on initialization
validateConfig();

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Check if Firebase is already initialized
if (getApps().length === 0) {
  // Initialize Firebase app
  app = initializeApp(firebaseConfig);

  // Initialize Auth with AsyncStorage persistence for React Native
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

  // Initialize Firestore (online-only, minimal cache)
  db = getFirestore(app);

  console.log('✅ Firebase initialized successfully (Auth + Firestore only)');
} else {
  // Use existing Firebase instance
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);

  console.log('✅ Using existing Firebase instance');
}

// Export Firebase services (no Storage - staying on free tier)
export { app, auth, db };

// Export Firebase config for Google Sign-In
export const googleClientIds = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
};
