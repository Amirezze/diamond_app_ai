import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppDispatch } from '../../store/hooks';
import { signInWithEmail, signInWithGoogle } from '../../store/authSlice';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { googleClientIds } from '../../config/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleClientIds.ios,
    androidClientId: googleClientIds.android,
    webClientId: googleClientIds.web,
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        handleGoogleSignInWithToken(authentication.idToken);
      } else {
        setGeneralError('Google sign in failed. No ID token received');
      }
    } else if (response?.type === 'error') {
      setGeneralError('Google authentication failed. Please try again');
    }
  }, [response]);

  const handleEmailSignIn = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    // Validate fields
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await dispatch(signInWithEmail({ email: email.trim(), password })).unwrap();
      // Navigate to home page after successful sign-in
      router.replace('/(tabs)');
    } catch (error: any) {
      // Map Firebase error codes to user-friendly messages
      const errorMessage = error?.toString() || '';

      if (errorMessage.includes('auth/wrong-password') || errorMessage.includes('auth/invalid-credential')) {
        setPasswordError('Incorrect password');
      } else if (errorMessage.includes('auth/user-not-found')) {
        setEmailError('No account found with this email');
      } else if (errorMessage.includes('auth/invalid-email')) {
        setEmailError('Invalid email address');
      } else if (errorMessage.includes('auth/user-disabled')) {
        setGeneralError('This account has been disabled');
      } else if (errorMessage.includes('auth/too-many-requests')) {
        setGeneralError('Too many failed attempts. Please try again later');
      } else {
        setGeneralError('Sign in failed. Please check your credentials and try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignInWithToken = async (idToken: string) => {
    try {
      setIsLoading(true);
      setGeneralError('');
      await dispatch(signInWithGoogle(idToken)).unwrap();
      // Navigate to home page after successful sign-in
      router.replace('/(tabs)');
    } catch (error: any) {
      setGeneralError('Google sign in failed. Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGeneralError('');
      await promptAsync();
    } catch (error: any) {
      setGeneralError('Google sign in failed. Please try again');
    }
  };

  // Clear errors when user types
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
    if (generalError) setGeneralError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
    if (generalError) setGeneralError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={['#1e2024', '#2a2c31']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#e4c078" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign In</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        {/* Welcome Section */}
        <View style={styles.logoSection}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitleText}>Sign in to access your diamond scans</Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          {/* General Error */}
          {generalError ? (
            <View style={styles.generalErrorContainer}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.generalErrorText}>{generalError}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={[styles.inputWrapper, emailError && styles.inputWrapperError]}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={handleEmailChange}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>
            {emailError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.inputWrapper, passwordError && styles.inputWrapperError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotPasswordButton}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.buttonDisabled]}
            onPress={handleEmailSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#e4c078', '#fce588']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signInButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#1e2024" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="#1e2024" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signUpSection}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 192, 120, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(228, 192, 120, 0.3)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Welcome Section
  logoSection: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e2024',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },

  // Form Section
  formSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  generalErrorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e2024',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e2024',
  },
  passwordToggle: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ef4444',
  },

  // Forgot Password
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e4c078',
  },

  // Sign In Button
  signInButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  signInButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e2024',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginHorizontal: 16,
  },

  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 18,
    marginBottom: 24,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e2024',
  },

  // Sign Up Section
  signUpSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e4c078',
  },
});
