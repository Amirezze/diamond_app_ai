import { DiamondScanner } from '@/components/DiamondScanner';
import { DiamondResult } from '@/components/DiamondResult';
import { CaratInput } from '@/components/CaratInput';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, ActivityIndicator, Text, Image, Modal } from "react-native";
import { useAppDispatch } from '@/store/hooks';
import { predictCut, detectShape, analyzeShapeAndColor, saveToHistory, setManualCaratWeight, clearPricingData, fetchDiamondPrice } from '@/store/diamondSlice';
import { useCutPrediction, useIsPredictingCut, useCutPredictionError, useShapeDetection, useIsDetectingShape, useShapeDetectionError, useColorPrediction, useIsPredictingColor, useColorPredictionError, useClarityPrediction, useIsPredictingClarity, useClarityPredictionError } from '@/store/hooks';
import { theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CameraTab() {
  const dispatch = useAppDispatch();
  const cutPrediction = useCutPrediction();
  const isPredicting = useIsPredictingCut();
  const predictionError = useCutPredictionError();
  const shapeDetection = useShapeDetection();
  const isDetectingShape = useIsDetectingShape();
  const shapeDetectionError = useShapeDetectionError();
  const colorPrediction = useColorPrediction();
  const isPredictingColor = useIsPredictingColor();
  const colorPredictionError = useColorPredictionError();
  const clarityPrediction = useClarityPrediction();
  const isPredictingClarity = useIsPredictingClarity();
  const clarityPredictionError = useClarityPredictionError();

  const [showScanner, setShowScanner] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showPreviewWithLoading, setShowPreviewWithLoading] = useState(false);
  const [showCaratInput, setShowCaratInput] = useState(false);
  const [caratWeight, setCaratWeight] = useState<number | null>(null);
  const [scannedImage, setScannedImage] = useState<{
    uri: string;
    base64: string;
    width: number;
    height: number;
  } | null>(null);

  // Clear pricing data when camera screen mounts (fresh scan)
  useEffect(() => {
    dispatch(clearPricingData());
    console.log('📸 Camera screen mounted - cleared old pricing data');
  }, [dispatch]);

  // Handle photo capture from camera
  const handlePhotoCapture = async (result: {
    uri: string;
    base64: string;
    width: number;
    height: number;
  }) => {
    setScannedImage(result);
    setShowScanner(false);
    setShowPreviewWithLoading(true);

    try {
      console.log('📸 Photo captured, starting combined shape + color analysis...');
      console.log('📸 Image URI:', result.uri);
      console.log('📸 Base64 length:', result.base64?.length || 0);

      // Step 1: Analyze diamond shape + color using Hugging Face combined model
      const analysisResult = await dispatch(
        analyzeShapeAndColor({
          imageUri: result.uri,
          base64Data: result.base64,
        })
      ).unwrap();

      console.log('✅ Shape detected:', analysisResult.shape.shape, 'Confidence:', analysisResult.shape.confidence);
      console.log('✅ Color detected:', analysisResult.color.colorGrade, 'Confidence:', analysisResult.color.confidence);
      if (analysisResult.clarity) {
        console.log('✅ Clarity detected:', analysisResult.clarity.clarityGrade, 'Confidence:', analysisResult.clarity.confidence);
      }

      // Step 2: Show carat input modal
      setShowPreviewWithLoading(false);
      setShowCaratInput(true);
    } catch (error: any) {
      // Log the error for debugging
      console.error('❌ Analysis failed:', error);

      // Hide preview
      setShowPreviewWithLoading(false);

      // Analysis failed, show error alert
      const errorMessage = typeof error === 'string'
        ? error
        : error?.message || shapeDetectionError || colorPredictionError || predictionError || 'Failed to analyze diamond. Please try again.';

      Alert.alert(
        'Analysis Failed',
        errorMessage,
        [
          {
            text: 'Retry',
            onPress: () => {
              setShowScanner(true);
              setScannedImage(null);
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              router.back();
            },
            style: 'cancel',
          },
        ]
      );
    }
  };

  // Handle image upload from gallery
  const handleImageUpload = async () => {
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
        allowsEditing: false,
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        console.log('📁 Image selected from gallery');
        console.log('📁 Image URI:', asset.uri);
        console.log('📁 Image dimensions:', asset.width, 'x', asset.height);

        // Process the uploaded image similar to camera capture
        handlePhotoCapture({
          uri: asset.uri,
          base64: asset.base64 || '',
          width: asset.width,
          height: asset.height,
        });
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleScannerClose = () => {
    setShowScanner(false);
    router.back();
  };

  const handleResultBack = () => {
    setShowResult(false);
    setScannedImage(null);
    setCaratWeight(null);
    router.back();
  };

  const handleScanAgain = () => {
    // Clear all state for new scan
    setShowResult(false);
    setScannedImage(null);
    setCaratWeight(null);
    setShowScanner(true);

    // Clear pricing data from Redux so new scan fetches fresh pricing
    dispatch(clearPricingData());
    console.log('🔄 Cleared pricing data for new scan');
  };

  const handleCaratSubmit = async (weight: number) => {
    setCaratWeight(weight);
    // Store carat weight in Redux for history saving
    dispatch(setManualCaratWeight({
      caratWeight: weight,
      imageUri: scannedImage!.uri
    }));
    setShowCaratInput(false);
    setShowPreviewWithLoading(true);

    try {
      // Step 3: Predict cut quality
      console.log('🔍 Starting cut quality prediction...');
      await dispatch(
        predictCut({
          imageUri: scannedImage!.uri,
          base64Data: scannedImage!.base64,
        })
      ).unwrap();

      console.log('✅ Cut prediction complete!');

      // Step 4: Fetch real-time pricing
      console.log('💰 Fetching diamond pricing...');
      try {
        await dispatch(fetchDiamondPrice()).unwrap();
        console.log('✅ Pricing fetched successfully');
      } catch (pricingError: any) {
        console.warn('⚠️ Failed to fetch pricing:', pricingError);
        // Continue even if pricing fails - will use estimated price
      }

      // Step 5: Auto-save to history (now with pricing data!)
      console.log('💾 Saving to history...');
      try {
        const savedHistory = await dispatch(saveToHistory()).unwrap();
        console.log('✅ Automatically saved to history');

        // Debug: Verify pricing data was saved
        if (savedHistory && savedHistory.length > 0) {
          const latestScan = savedHistory[0];
          console.log('🔍 Saved scan debug:');
          console.log('  - Has pricingData?', !!latestScan.pricingData);
          console.log('  - Total price:', latestScan.pricingData?.totalPrice || latestScan.estimatedPrice);
        }
      } catch (saveError) {
        console.warn('⚠️ Failed to auto-save to history:', saveError);
        // Don't block the user from seeing results if save fails
      }

      setShowPreviewWithLoading(false);
      setShowResult(true);
    } catch (error: any) {
      console.error('❌ Cut prediction failed:', error);
      setShowPreviewWithLoading(false);

      const errorMessage = typeof error === 'string'
        ? error
        : error?.message || predictionError || 'Failed to analyze diamond cut. Please try again.';

      Alert.alert(
        'Analysis Failed',
        errorMessage,
        [
          {
            text: 'Retry',
            onPress: () => {
              setShowScanner(true);
              setScannedImage(null);
              setCaratWeight(null);
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              router.back();
            },
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleCaratCancel = () => {
    setShowCaratInput(false);
    setScannedImage(null);
    setShowScanner(true);
  };

  return (
    <View style={styles.container}>
      {/* Diamond Scanner */}
      {showScanner && (
        <DiamondScanner
          onPhotoCapture={handlePhotoCapture}
          onClose={handleScannerClose}
          onImageUpload={handleImageUpload}
          enableRealTimeDetection={false}
        />
      )}

      {/* Preview with Loading Modal */}
      {showPreviewWithLoading && scannedImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: scannedImage.uri }} style={styles.previewImage} />

          {/* Loading Modal Overlay */}
          <View style={styles.loadingModal}>
            <View style={styles.loadingCard}>
              <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.loadingCardGradient}
              >
                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>

                {/* Text Content */}
                <Text style={styles.loadingModalText}>
                  Analyzing Diamond Quality
                </Text>
                <Text style={styles.loadingModalSubtext}>
                  Processing quality & fetching pricing
                </Text>

                {/* Loading Dots */}
                <View style={styles.loadingDotsContainer}>
                  <View style={[styles.loadingDot, styles.loadingDotActive]} />
                  <View style={[styles.loadingDot, styles.loadingDotActive]} />
                  <View style={[styles.loadingDot, styles.loadingDotActive]} />
                </View>

                <Text style={styles.loadingModalNote}>
                  Please wait while we analyze your diamond
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      )}

      {/* Carat Input Modal */}
      {showCaratInput && shapeDetection && (
        <CaratInput
          visible={showCaratInput}
          detectedShape={shapeDetection.shape}
          onSubmit={handleCaratSubmit}
          onCancel={handleCaratCancel}
        />
      )}

      {/* Diamond Result */}
      {showResult && scannedImage && cutPrediction && shapeDetection && (
        <DiamondResult
          scannedImage={scannedImage}
          cutPrediction={cutPrediction}
          colorPrediction={colorPrediction || undefined}
          clarityPrediction={clarityPrediction || undefined}
          shapeDetection={shapeDetection}
          caratWeight={caratWeight || undefined}
          onBack={handleResultBack}
          onScanAgain={handleScanAgain}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  loadingModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingCardGradient: {
    padding: 36,
    alignItems: 'center',
  },
  progressContainer: {
    marginBottom: 24,
  },
  loadingModalText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  loadingModalSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  loadingDotActive: {
    backgroundColor: theme.primary,
  },
  loadingModalNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
