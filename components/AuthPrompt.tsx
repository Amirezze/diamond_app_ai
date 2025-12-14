import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface AuthPromptProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthPrompt({ visible, onClose }: AuthPromptProps) {
  const handleSignIn = () => {
    onClose();
    router.push('/(auth)/sign-in');
  };

  const handleSignUp = () => {
    onClose();
    router.push('/(auth)/sign-up');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#e4c078', '#fce588']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="diamond" size={48} color="#1e2024" />
            </LinearGradient>
          </View>

          {/* Content */}
          <Text style={styles.title}>Save Your Diamond Scans</Text>
          <Text style={styles.subtitle}>
            Sign in to access your history from any device
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="cloud-upload-outline" size={20} color="#e4c078" />
              <Text style={styles.benefitText}>Save unlimited scans</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="phone-portrait-outline" size={20} color="#e4c078" />
              <Text style={styles.benefitText}>Access from anywhere</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="layers-outline" size={20} color="#e4c078" />
              <Text style={styles.benefitText}>Track your collection</Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#e4c078', '#fce588']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Continue without saving</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: screenWidth - 40,
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  // Icon
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e2024',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Benefits List
  benefitsList: {
    width: '100%',
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e2024',
  },

  // Primary Button
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e2024',
  },

  // Secondary Button
  secondaryButton: {
    width: '100%',
    backgroundColor: '#1e2024',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e4c078',
  },

  // Cancel Button
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
});
