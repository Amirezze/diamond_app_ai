import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { auth } from '../config/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

interface ChangePasswordProps {
  visible: boolean;
  onClose: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({
  visible,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Same Password', 'New password must be different from current password');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert('Invalid Password', passwordError);
      return;
    }

    try {
      setIsChanging(true);

      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No user logged in');
      }

      // Re-authenticate user with current password
      console.log('🔐 Re-authenticating user...');
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      console.log('✅ Re-authentication successful');

      // Update password
      console.log('🔑 Updating password...');
      await updatePassword(user, newPassword);
      console.log('✅ Password updated successfully');

      Alert.alert(
        'Success',
        'Your password has been changed successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Password change error:', error);

      let errorMessage = 'Failed to change password. Please try again.';

      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign out and sign in again before changing your password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsChanging(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const getPasswordStrength = (password: string): { strength: string; color: string; percentage: number } => {
    if (password.length === 0) return { strength: '', color: '#e2e8f0', percentage: 0 };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { strength: 'Weak', color: '#ef4444', percentage: 25 };
    if (score === 2) return { strength: 'Fair', color: '#f59e0b', percentage: 50 };
    if (score === 3) return { strength: 'Good', color: '#10b981', percentage: 75 };
    return { strength: 'Strong', color: '#059669', percentage: 100 };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
              <Text style={styles.title}>Change Password</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Form */}
              <View style={styles.form}>
                {/* Current Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showCurrentPassword}
                      editable={!isChanging}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                      <Ionicons
                        name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="key-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showNewPassword}
                      editable={!isChanging}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Password Strength Indicator */}
                  {newPassword.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBar}>
                        <View
                          style={[
                            styles.strengthFill,
                            {
                              width: `${passwordStrength.percentage}%`,
                              backgroundColor: passwordStrength.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                        {passwordStrength.strength}
                      </Text>
                    </View>
                  )}

                  {/* Password Requirements */}
                  <View style={styles.requirementsContainer}>
                    <Text style={styles.requirementsTitle}>Password must contain:</Text>
                    <View style={styles.requirement}>
                      <Ionicons
                        name={newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={newPassword.length >= 6 ? '#10b981' : '#94a3b8'}
                      />
                      <Text style={[styles.requirementText, newPassword.length >= 6 && styles.requirementMet]}>
                        At least 6 characters
                      </Text>
                    </View>
                    <View style={styles.requirement}>
                      <Ionicons
                        name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={/[A-Z]/.test(newPassword) ? '#10b981' : '#94a3b8'}
                      />
                      <Text style={[styles.requirementText, /[A-Z]/.test(newPassword) && styles.requirementMet]}>
                        One uppercase letter
                      </Text>
                    </View>
                    <View style={styles.requirement}>
                      <Ionicons
                        name={/[0-9]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={/[0-9]/.test(newPassword) ? '#10b981' : '#94a3b8'}
                      />
                      <Text style={[styles.requirementText, /[0-9]/.test(newPassword) && styles.requirementMet]}>
                        One number
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPassword}
                      editable={!isChanging}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  </View>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <Text style={styles.errorText}>Passwords do not match</Text>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                  disabled={isChanging}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, isChanging && styles.buttonDisabled]}
                  onPress={handleChangePassword}
                  activeOpacity={0.8}
                  disabled={isChanging}
                >
                  <LinearGradient
                    colors={['#e4c078', '#fce588']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    {isChanging ? (
                      <ActivityIndicator color="#1e2024" size="small" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={20} color="#1e2024" />
                        <Text style={styles.saveButtonText}>Change Password</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 40,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  strengthContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  requirementMet: {
    color: '#10b981',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#e4c078',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e2024',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
