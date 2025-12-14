import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { resetPassword } from '../../store/authSlice';

export default function ForgotPasswordScreen() {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Missing Email', 'Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await dispatch(resetPassword(email.trim())).unwrap();
      setEmailSent(true);
      Alert.alert(
        'Email Sent',
        'Check your email for a password reset link. It may take a few minutes to arrive.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error);
    } finally {
      setIsLoading(false);
    }
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
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        {/* Icon Section */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <LinearGradient
              colors={['#e4c078', '#fce588']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="key" size={48} color="#1e2024" />
            </LinearGradient>
          </View>
          <Text style={styles.titleText}>Forgot Password?</Text>
          <Text style={styles.subtitleText}>
            Enter your email and we'll send you a link to reset your password
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading && !emailSent}
              />
            </View>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, (isLoading || emailSent) && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading || emailSent}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#e4c078', '#fce588']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resetButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#1e2024" />
              ) : emailSent ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#1e2024" />
                  <Text style={styles.resetButtonText}>Email Sent</Text>
                </>
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Link</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Back to Sign In */}
          <View style={styles.signInSection}>
            <Text style={styles.signInText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            The password reset link will expire in 1 hour. Check your spam folder if you don't see the email.
          </Text>
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

  // Icon Section
  iconSection: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 24,
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e2024',
    marginBottom: 12,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },

  // Form Section
  formSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e2024',
  },

  // Reset Button
  resetButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  resetButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e2024',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Sign In Section
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e4c078',
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    lineHeight: 18,
  },
});
