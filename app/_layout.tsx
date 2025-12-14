import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { useEffect } from "react";
import { onAuthStateChanged } from "../services/authService";
import { setUser, setInitializingComplete, convertFirebaseUser, loadUserProfile } from "../store/authSlice";
import { useAppDispatch, useAuthInitializing } from "../store/hooks";
import { ActivityIndicator, View, StyleSheet } from "react-native";

// Auth listener component (must be inside Provider)
function AuthListener({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isInitializing = useAuthInitializing();

  useEffect(() => {
    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const user = convertFirebaseUser(firebaseUser);
        dispatch(setUser(user));

        // Load user profile from Firestore
        try {
          await dispatch(loadUserProfile(firebaseUser.uid)).unwrap();
        } catch (error) {
          console.warn('Could not load user profile:', error);
        }
      } else {
        // User is signed out
        dispatch(setUser(null));
      }

      // Mark initialization as complete
      dispatch(setInitializingComplete());
    });

    // Cleanup listener on unmount
    return unsubscribe;
  }, [dispatch]);

  // Show loading screen while checking auth state
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e4c078" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthListener>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        </Stack>
      </AuthListener>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});
