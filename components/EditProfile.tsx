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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface EditProfileProps {
  visible: boolean;
  currentName: string;
  currentPhotoURL?: string;
  onClose: () => void;
  onSave: (name: string, photoURL?: string) => Promise<void>;
}

export const EditProfile: React.FC<EditProfileProps> = ({
  visible,
  currentName,
  currentPhotoURL,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(currentName);
  const [photoURL, setPhotoURL] = useState(currentPhotoURL || '');
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoURL(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setPhotoURL(''),
        },
      ]
    );
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Please enter your name');
      return;
    }

    const hasChanges = trimmedName !== currentName || photoURL !== (currentPhotoURL || '');

    if (!hasChanges) {
      Alert.alert('No Changes', 'You haven\'t made any changes');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(trimmedName, photoURL || undefined);
      Alert.alert('Success', 'Profile updated successfully');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(currentName);
    setPhotoURL(currentPhotoURL || '');
    onClose();
  };

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
              <Text style={styles.title}>Edit Profile</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Profile Photo */}
              <View style={styles.photoSection}>
                <Text style={styles.inputLabel}>Profile Photo</Text>
                <View style={styles.photoContainer}>
                  {photoURL ? (
                    <View style={styles.photoWrapper}>
                      <Image source={{ uri: photoURL }} style={styles.profilePhoto} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={handleRemovePhoto}
                        disabled={isSaving}
                      >
                        <Ionicons name="close-circle" size={28} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.placeholderPhoto}>
                      <LinearGradient
                        colors={['#e4c078', '#fce588']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.placeholderGradient}
                      >
                        <Ionicons name="person" size={48} color="#1e2024" />
                      </LinearGradient>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={handlePickImage}
                    disabled={isSaving}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#e4c078', '#fce588']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.changePhotoGradient}
                    >
                      <Ionicons name="camera" size={18} color="#1e2024" />
                      <Text style={styles.changePhotoText}>
                        {photoURL ? 'Change Photo' : 'Add Photo'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#94a3b8"
                    editable={!isSaving}
                    autoFocus
                  />
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.8}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={isSaving}
              >
                <LinearGradient
                  colors={['#e4c078', '#fce588']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#1e2024" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#1e2024" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    maxHeight: '80%',
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
  // Photo Section
  photoSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  photoWrapper: {
    position: 'relative',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e4c078',
  },
  placeholderPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#e2e8f0',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  changePhotoButton: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#e4c078',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4,
  },
  changePhotoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e2024',
  },
});
