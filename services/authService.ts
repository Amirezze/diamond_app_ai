import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Sign up with email and password
 * Creates a new user account and sets the display name
 */
export const signUpWithEmailPassword = async (
  email: string,
  password: string,
  name: string
): Promise<FirebaseUser> => {
  try {
    // Validate inputs
    if (!email || !password || !name) {
      throw new Error('Email, password, and name are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update user profile with display name
    await updateProfile(userCredential.user, {
      displayName: name,
    });

    // Create user profile in Firestore
    const { createUserProfile } = await import('./firestoreService');
    await createUserProfile(userCredential.user.uid, {
      uid: userCredential.user.uid,
      email: email,
      name: name,
      preferences: {
        emailNotifications: true,
        darkMode: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scanCount: 0,
    });

    console.log('✅ User signed up successfully:', userCredential.user.email);
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Sign up error:', error.message);
    throw new Error(getAuthErrorMessage(error.code || error.message));
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmailPassword = async (
  email: string,
  password: string
): Promise<FirebaseUser> => {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ User signed in successfully:', userCredential.user.email);
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Sign in error:', error.message);
    throw new Error(getAuthErrorMessage(error.code || error.message));
  }
};

/**
 * Sign in with Google using ID token
 * This function should be called after obtaining the ID token from Google OAuth flow
 */
export const signInWithGoogleToken = async (idToken: string): Promise<FirebaseUser> => {
  try {
    if (!idToken) {
      throw new Error('No ID token provided');
    }

    // Create Firebase credential from Google ID token
    const credential = GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase with the credential
    const userCredential = await signInWithCredential(auth, credential);

    // Check if this is a new user and create profile if needed
    const isNewUser = userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime;

    if (isNewUser) {
      const { createUserProfile } = await import('./firestoreService');
      await createUserProfile(userCredential.user.uid, {
        uid: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: userCredential.user.displayName || 'User',
        photoURL: userCredential.user.photoURL || undefined,
        preferences: {
          emailNotifications: true,
          darkMode: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        scanCount: 0,
      });
      console.log('✅ New user profile created');
    }

    console.log('✅ User signed in with Google:', userCredential.user.email);
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error.message);
    throw new Error(getAuthErrorMessage(error.code || error.message));
  }
};

/**
 * Sign out the current user
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    console.log('✅ User signed out successfully');
  } catch (error: any) {
    console.error('❌ Sign out error:', error.message);
    throw new Error('Failed to sign out');
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    await firebaseSendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent to:', email);
  } catch (error: any) {
    console.error('❌ Password reset error:', error.message);
    throw new Error(getAuthErrorMessage(error.code || error.message));
  }
};

/**
 * Listen to auth state changes
 * Call this in app/_layout.tsx to sync auth state with Redux
 */
export const onAuthStateChanged = (
  callback: (user: FirebaseUser | null) => void
) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

/**
 * Get current user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Convert Firebase error codes to user-friendly messages
 */
const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/weak-password': 'Password must be at least 6 characters long.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
    'auth/cancelled-popup-request': 'Sign-in cancelled. Please try again.',
  };

  return errorMessages[errorCode] || errorCode || 'An unexpected error occurred. Please try again.';
};
