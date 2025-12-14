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
} from 'react-native';

interface CaratInputProps {
  visible: boolean;
  detectedShape: string;
  onSubmit: (caratWeight: number) => void;
  onCancel: () => void;
}

export const CaratInput: React.FC<CaratInputProps> = ({
  visible,
  detectedShape,
  onSubmit,
  onCancel,
}) => {
  const [caratWeight, setCaratWeight] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const weight = parseFloat(caratWeight);

    if (!caratWeight || isNaN(weight)) {
      setError('Please enter a valid carat weight');
      return;
    }

    if (weight <= 0) {
      setError('Carat weight must be greater than 0');
      return;
    }

    if (weight > 100) {
      setError('Please enter a realistic carat weight');
      return;
    }

    setError('');
    onSubmit(weight);
    setCaratWeight(''); // Reset for next time
  };

  const handleCancel = () => {
    setCaratWeight('');
    setError('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackground}>
          <LinearGradient
            colors={['#ffffff', '#f9fafb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Enter Carat Weight</Text>
              <Text style={styles.subtitle}>
                Shape detected: <Text style={styles.shapeText}>{detectedShape}</Text>
              </Text>
            </View>

            {/* Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Carat Weight</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={caratWeight}
                  onChangeText={(text) => {
                    setCaratWeight(text);
                    setError('');
                  }}
                  placeholder="e.g., 1.5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.inputUnit}>ct</Text>
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={styles.helperText}>
                Please weigh your diamond and enter the weight in carats
              </Text>
            </View>

            {/* Quick Selection Buttons */}
            <View style={styles.quickSelectSection}>
              <Text style={styles.quickSelectLabel}>Common weights:</Text>
              <View style={styles.quickSelectButtons}>
                {['0.5', '1.0', '1.5', '2.0'].map((weight) => (
                  <TouchableOpacity
                    key={weight}
                    style={styles.quickSelectButton}
                    onPress={() => setCaratWeight(weight)}
                  >
                    <Text style={styles.quickSelectText}>{weight}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#e4c078', '#fce588']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    padding: 24,
    shadowColor: '#e4c078',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(228, 192, 120, 0.2)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  shapeText: {
    color: '#b8860b',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 19,
    fontWeight: '700',
    color: '#1f2937',
  },
  inputUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 6,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  quickSelectSection: {
    marginBottom: 20,
  },
  quickSelectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 10,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  quickSelectButton: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quickSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b8860b',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    borderRadius: 14,
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
  submitButtonGradient: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
