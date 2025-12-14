import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User as FirebaseUser } from 'firebase/auth';

// User interface
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// User profile interface (stored in Firestore)
export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  preferences: {
    emailNotifications: boolean;
    darkMode: boolean;
  };
  createdAt: number;
  updatedAt: number;
  scanCount: number;
}

// Auth state interface
interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean; // Separate loading for initial auth check
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true, // Start as true until we check auth state
  error: null,
};

// Helper to convert Firebase user to our User interface
export const convertFirebaseUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName,
  photoURL: firebaseUser.photoURL,
});

// Async thunk for signing up with email/password
export const signUpWithEmail = createAsyncThunk(
  'auth/signUpWithEmail',
  async (
    { email, password, name }: { email: string; password: string; name: string },
    { rejectWithValue }
  ) => {
    try {
      const { signUpWithEmailPassword } = await import('../services/authService');
      const user = await signUpWithEmailPassword(email, password, name);
      return convertFirebaseUser(user);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign up');
    }
  }
);

// Async thunk for signing in with email/password
export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const { signInWithEmailPassword } = await import('../services/authService');
      const user = await signInWithEmailPassword(email, password);
      return convertFirebaseUser(user);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign in');
    }
  }
);

// Async thunk for signing in with Google
export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (idToken: string, { rejectWithValue }) => {
    try {
      const { signInWithGoogleToken } = await import('../services/authService');
      const user = await signInWithGoogleToken(idToken);
      return convertFirebaseUser(user);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign in with Google');
    }
  }
);

// Async thunk for signing out
export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      const { signOutUser } = await import('../services/authService');
      await signOutUser();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to sign out');
    }
  }
);

// Async thunk for loading user profile from Firestore
export const loadUserProfile = createAsyncThunk(
  'auth/loadUserProfile',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { getUserProfile } = await import('../services/firestoreService');
      const profile = await getUserProfile(userId);
      return profile;
    } catch (error: any) {
      console.warn('Failed to load user profile:', error.message);
      // Don't reject - profile might not exist yet
      return null;
    }
  }
);

// Async thunk for updating user profile
export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    { userId, data }: { userId: string; data: Partial<UserProfile> },
    { rejectWithValue }
  ) => {
    try {
      const { updateUserProfile } = await import('../services/firestoreService');
      await updateUserProfile(userId, data);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

// Async thunk for password reset
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const { sendPasswordResetEmail } = await import('../services/authService');
      await sendPasswordResetEmail(email);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send password reset email');
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set user from auth listener (called from _layout.tsx)
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isInitializing = false;
    },
    // Set profile
    setProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.profile = action.payload;
    },
    // Clear auth state
    clearAuth: (state) => {
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    // Set initializing complete
    setInitializingComplete: (state) => {
      state.isInitializing = false;
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign up with email/password
      .addCase(signUpWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUpWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signUpWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Sign in with email/password
      .addCase(signInWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Sign in with Google
      .addCase(signInWithGoogle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Sign out
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.profile = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Load user profile
      .addCase(loadUserProfile.pending, (state) => {
        // Don't set loading for profile - it's loaded in background
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(loadUserProfile.rejected, (state) => {
        // Silently fail - profile might not exist yet
        state.profile = null;
      })
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.profile) {
          state.profile = {
            ...state.profile,
            ...action.payload,
            updatedAt: Date.now(),
          };
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Reset password
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { setUser, setProfile, clearAuth, setInitializingComplete, clearError } = authSlice.actions;

// Export reducer
export const authReducer = authSlice.reducer;
