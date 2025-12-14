import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { theme } from '../constants/theme';
import axios from 'axios';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type OutputResolution = 224 | 512 | 1024;
type FlashDefaultMode = 'off' | 'auto' | 'on';

interface DiamondScannerProps {
  onPhotoCapture?: (result: {
    uri: string;
    base64: string;
    width: number;
    height: number;
  }) => void;
  onClose?: () => void;
  onImageUpload?: () => void;
  outputResolution?: OutputResolution;
  showCropPreview?: boolean;
  flashDefaultMode?: FlashDefaultMode;
  enableRealTimeDetection?: boolean;
}

interface DetectionResult {
  shape: string;
  confidence: number;
}

interface ScanResult {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

export const DiamondScanner: React.FC<DiamondScannerProps> = ({
  onPhotoCapture,
  onClose,
  onImageUpload,
  outputResolution = 512,
  showCropPreview = true,
  flashDefaultMode = 'auto',
  enableRealTimeDetection = false,
}) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>(flashDefaultMode);
  const [zoom, setZoom] = useState(0);
  const [overlayScale, setOverlayScale] = useState(0.6);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTimer, setPreviewTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ScanResult | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Real-time detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const detectionLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lastCaptureTimeRef = useRef<number>(0);
  const isDetectingRef = useRef(false);

  // Lock orientation to portrait on mount
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
    lockOrientation();

    // Unlock orientation on unmount
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Request camera permissions
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Real-time detection functions (defined here to avoid hook order issues)
  const captureFrameForDetection = async (): Promise<string | null> => {
    if (!cameraRef.current || isProcessingFrame || isCapturing) return null;

    // Throttle captures to prevent camera overload (minimum 500ms between captures)
    const now = Date.now();
    if (now - lastCaptureTimeRef.current < 500) {
      return null;
    }

    try {
      lastCaptureTimeRef.current = now;
      setIsProcessingFrame(true);

      // Capture frame with better quality for detection
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Higher quality for better detection
        base64: false,
        skipProcessing: false,
        exif: false,
      });

      if (!photo?.uri) {
        console.log('No photo URI in captured photo');
        return null;
      }

      // Resize to square 640x640 for optimal detection
      const resizedImage = await manipulateAsync(
        photo.uri,
        [
          {
            resize: {
              width: 640,
              height: 640,
            },
          },
        ],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!resizedImage.base64) {
        console.log('No base64 data after resize');
        return null;
      }

      console.log('📸 Captured and resized image: 640x640, base64 length:', resizedImage.base64.length);
      return resizedImage.base64;
    } catch (error: any) {
      // Only log non-busy errors
      if (!error.message?.includes('busy') && !error.message?.includes('could not be captured')) {
        console.error('Error capturing frame:', error.message);
      }
      return null;
    } finally {
      setIsProcessingFrame(false);
    }
  };

  const detectDiamondShape = async (base64Image: string): Promise<void> => {
    try {
      console.log('🔍 Sending detection request to Hugging Face...');
      console.log('Base64 length:', base64Image.length);

      const BASE_URL = 'https://amirezze-diamond-color-grading.hf.space';

      // Prepare image data in Gradio format
      let imageData = base64Image;
      if (!imageData.startsWith('data:image')) {
        imageData = `data:image/jpeg;base64,${imageData}`;
      }

      const imagePayload = {
        path: null,
        url: imageData,
        size: null,
        orig_name: 'diamond.jpg',
        mime_type: 'image/jpeg',
        is_stream: false,
        meta: { _type: 'gradio.FileData' }
      };

      // Try the /api endpoint first for real-time detection
      const callUrl = `${BASE_URL}/api/predict_diamond`;

      const callResponse = await fetch(callUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [imagePayload]
        }),
      });

      if (!callResponse.ok) {
        console.warn('⚠️ API call failed:', callResponse.status);
        return;
      }

      const callResult = await callResponse.json();
      const eventId = callResult.event_id;

      if (!eventId) {
        console.warn('⚠️ No event_id received');
        return;
      }

      // Poll for results (with timeout for real-time detection)
      const pollUrl = `${BASE_URL}/api/predict_diamond/${eventId}`;
      const maxAttempts = 5; // Reduced for real-time responsiveness
      const pollInterval = 500;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const pollResponse = await fetch(pollUrl);
        if (!pollResponse.ok) continue;

        const text = await pollResponse.text();
        const lines = text.trim().split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line === 'event: complete') {
            const dataLine = lines[i + 1];
            if (!dataLine || !dataLine.startsWith('data: ')) continue;

            try {
              const output = JSON.parse(dataLine.substring(6));
              if (!output || !Array.isArray(output) || output.length < 2) continue;

              const [, labelDict] = output;
              const allConfidences = labelDict?.confidences || [];

              // Extract shape prediction
              const shapeConfidences = allConfidences.filter((c: any) =>
                c.label?.startsWith('Shape: ')
              );

              if (shapeConfidences.length > 0) {
                const topShape = shapeConfidences.reduce((max: any, c: any) =>
                  (c.confidence > (max?.confidence || 0)) ? c : max, null
                );

                const shapeName = topShape.label.replace('Shape: ', '');
                const confidence = topShape.confidence;

                console.log('✅ Detected shape:', shapeName, 'Confidence:', confidence);

                // Update detection result with lower threshold for real-time
                if (confidence > 0.15) {
                  if (!detectionResult || detectionResult.shape !== shapeName) {
                    setDetectionResult({
                      shape: shapeName,
                      confidence: confidence,
                    });

                    // Trigger fade animation
                    Animated.sequence([
                      Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                      }),
                      Animated.timing(fadeAnim, {
                        toValue: 0.9,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                    ]).start();
                  }
                } else {
                  console.log('⚠️ Low confidence:', confidence);
                }
              }
              return; // Exit after successful detection
            } catch (parseError) {
              console.warn('⚠️ Parse error:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      // Silently handle errors in real-time detection to avoid UI disruption
      if (error.code !== 'ECONNABORTED') {
        console.error('❌ Detection error:', error.message);
      }
    }
  };

  const startDetectionLoop = () => {
    if (!enableRealTimeDetection || isDetectingRef.current) return;

    isDetectingRef.current = true;
    setIsDetecting(true);

    const runDetection = async () => {
      if (!isDetectingRef.current || !enableRealTimeDetection) return;

      const base64Frame = await captureFrameForDetection();

      if (base64Frame && isDetectingRef.current) {
        await detectDiamondShape(base64Frame);
      }

      // Schedule next detection (500-700ms interval to match throttle)
      if (isDetectingRef.current) {
        const randomDelay = 500 + Math.random() * 200;
        detectionLoopRef.current = setTimeout(runDetection, randomDelay);
      }
    };

    runDetection();
  };

  const stopDetectionLoop = () => {
    isDetectingRef.current = false;
    setIsDetecting(false);
    if (detectionLoopRef.current) {
      clearTimeout(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    setDetectionResult(null);
  };

  // Start/stop detection loop based on enableRealTimeDetection prop
  useEffect(() => {
    if (enableRealTimeDetection && permission?.granted) {
      startDetectionLoop();
    } else {
      stopDetectionLoop();
    }

    return () => {
      stopDetectionLoop();
    };
  }, [enableRealTimeDetection, permission?.granted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionLoopRef.current) {
        clearTimeout(detectionLoopRef.current);
      }
    };
  }, []);

  // Pulse animation for scanning indicator
  useEffect(() => {
    if (isDetecting && !detectionResult) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isDetecting, detectionResult]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Flash mode cycling: off → auto → on → off
  const toggleFlash = () => {
    if (flash === 'off') {
      setFlash('auto');
    } else if (flash === 'auto') {
      setFlash('on');
    } else {
      setFlash('off');
    }
  };

  // Get flash mode display text
  const getFlashModeText = () => {
    switch (flash) {
      case 'off': return 'OFF';
      case 'auto': return 'AUTO';
      case 'on': return 'ON';
      default: return 'OFF';
    }
  };

  // Crop to square based on the overlay, accounting for zoom
  const cropToSquare = async (imageUri: string): Promise<ScanResult> => {
    try {
      // Get the actual image dimensions first
      const imageInfo = await manipulateAsync(imageUri, [], {
        format: SaveFormat.PNG,
        compress: 1
      });

      // Calculate the overlay size relative to screen
      const overlaySize = Math.min(screenWidth, screenHeight) * overlayScale;

      // Calculate the crop ratio - how much of the screen the overlay takes up
      const cropRatioX = overlaySize / screenWidth;
      const cropRatioY = overlaySize / screenHeight;

      // Apply the same ratio to the actual captured image dimensions
      const cropWidth = imageInfo.width * cropRatioX;
      const cropHeight = imageInfo.height * cropRatioY;

      // Center the crop area
      const cropX = (imageInfo.width - cropWidth) / 2;
      const cropY = (imageInfo.height - cropHeight) / 2;

      // Use the smaller dimension to ensure we get a perfect square
      const squareSize = Math.min(cropWidth, cropHeight);
      const squareCropX = cropX + (cropWidth - squareSize) / 2;
      const squareCropY = cropY + (cropHeight - squareSize) / 2;

      // Crop to square area and resize to target resolution
      const croppedImage = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: squareCropX,
              originY: squareCropY,
              width: squareSize,
              height: squareSize,
            },
          },
          {
            resize: {
              width: outputResolution,
              height: outputResolution,
            },
          },
        ],
        {
          compress: 0.8, // Good quality with reasonable file size
          format: SaveFormat.JPEG, // Use JPEG for smaller file size
          base64: true,
        }
      );

      return {
        uri: croppedImage.uri,
        base64: croppedImage.base64 || '',
        width: outputResolution,
        height: outputResolution,
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  };

  // Handle preview timer and auto-proceed
  const startPreviewTimer = (processedImage: ScanResult) => {
    if (previewTimer) {
      clearTimeout(previewTimer);
    }

    const timer = setTimeout(() => {
      handleUsePhoto(processedImage);
    }, 5000); // Increased to 5 seconds for better user experience

    setPreviewTimer(timer);
  };

  const handleRetake = () => {
    if (previewTimer) {
      clearTimeout(previewTimer);
      setPreviewTimer(null);
    }
    setShowPreview(false);
    setPreviewImage(null);
    setProcessedImageData(null);
    setIsCapturing(false);
  };

  const handleUsePhoto = (processedImage?: ScanResult) => {
    if (previewTimer) {
      clearTimeout(previewTimer);
      setPreviewTimer(null);
    }
    setShowPreview(false);
    setPreviewImage(null);
    const imageToUse = processedImage || processedImageData;
    setProcessedImageData(null);
    setIsCapturing(false);
    if (imageToUse) {
      onPhotoCapture?.(imageToUse);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1, // Maximum quality
        base64: false,
        skipProcessing: true, // Skip processing to get native resolution
        exif: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      // Process the image (crop and resize to square)
      const processedImage = await cropToSquare(photo.uri);

      if (showCropPreview) {
        // Show preview with 2-second auto-proceed
        setPreviewImage(processedImage.uri);
        setProcessedImageData(processedImage);
        setShowPreview(true);
        startPreviewTimer(processedImage);
      } else {
        // Direct callback without preview
        setIsCapturing(false);
        onPhotoCapture?.(processedImage);
      }

    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      setIsCapturing(false);
    }
  };

  // Frame size controls
  const adjustFrameSize = (increase: boolean) => {
    setOverlayScale(prev => {
      const newScale = increase ? prev + 0.05 : prev - 0.05;
      return Math.max(0.4, Math.min(0.8, newScale)); // Clamp between 0.4 and 0.8
    });
  };

  const overlaySize = Math.min(screenWidth, screenHeight) * overlayScale;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        zoom={zoom}
        autofocus="on"
        enableTorch={false}
        videoQuality="4:3"
      >
        {/* Header Controls */}
        <View style={styles.headerControls}>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
          )}

          <View style={styles.rightControls}>
            {onImageUpload && (
              <TouchableOpacity style={styles.uploadIconButton} onPress={onImageUpload}>
                <Ionicons name="images" size={24} color="white" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
              <Ionicons
                name={flash === 'off' ? 'flash-off' : flash === 'auto' ? 'flash' : 'flash'}
                size={24}
                color={flash === 'on' ? theme.accent : flash === 'auto' ? theme.primary : 'white'}
              />
              <Text style={styles.flashModeText}>{getFlashModeText()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Square Overlay Guide with Corner Brackets */}
        <View style={styles.overlayContainer}>
          <View style={[styles.overlay, styles.overlayTop]} />
          <View style={styles.overlayMiddle}>
            <View style={[styles.overlay, styles.overlaySide]} />
            <View style={[styles.squareOverlay, {
              width: overlaySize,
              height: overlaySize,
            }]}>
              {/* Corner Brackets */}
              <View style={[styles.cornerBracket, styles.topLeft]} />
              <View style={[styles.cornerBracket, styles.topRight]} />
              <View style={[styles.cornerBracket, styles.bottomLeft]} />
              <View style={[styles.cornerBracket, styles.bottomRight]} />

              <View style={styles.squareInner}>
                <Ionicons name="diamond-outline" size={32} color="white" />
              </View>
            </View>
            <View style={[styles.overlay, styles.overlaySide]} />
          </View>
          <View style={[styles.overlay, styles.overlayBottom]} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>
            {enableRealTimeDetection ? 'Point at diamond for real-time detection' : 'Center diamond in frame'}
          </Text>
          <Text style={styles.instructionSubtext}>
            Place on WHITE background
          </Text>
          <Text style={styles.instructionTip}>
            {enableRealTimeDetection ? 'Detection runs automatically' : 'Best near window or in bright room'}
          </Text>
        </View>

        {/* Real-time Detection Overlay */}
        {enableRealTimeDetection && (
          <View style={styles.detectionOverlay}>
            {!detectionResult && isDetecting && (
              <Animated.View
                style={[
                  styles.detectionBadge,
                  {
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                <Ionicons name="scan-circle-outline" size={18} color="#6366f1" />
                <Text style={styles.detectionText}>
                  {isProcessingFrame ? 'Analyzing...' : 'Scanning for diamonds...'}
                </Text>
              </Animated.View>
            )}

            {detectionResult && (
              <Animated.View
                style={[
                  styles.detectionResultBadge,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        scale: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={theme.gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.detectionResultGradient}
                >
                  <Ionicons name="diamond" size={20} color="white" />
                  <View style={styles.detectionResultContent}>
                    <Text style={styles.detectionShapeText}>
                      {detectionResult.shape}
                    </Text>
                    <Text style={styles.detectionConfidenceText}>
                      {Math.round(detectionResult.confidence)}% confident
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            )}
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Frame Size Controls */}
          <View style={styles.frameSizeContainer}>
            <Text style={styles.controlLabel}>Frame Size</Text>
            <View style={styles.frameSizeControls}>
              <TouchableOpacity
                style={[styles.frameButton, overlayScale <= 0.4 && styles.frameButtonDisabled]}
                onPress={() => adjustFrameSize(false)}
                disabled={overlayScale <= 0.4}
              >
                <Ionicons name="remove" size={20} color="white" />
              </TouchableOpacity>
              <Text style={styles.frameSizeText}>{Math.round(overlayScale * 100)}%</Text>
              <TouchableOpacity
                style={[styles.frameButton, overlayScale >= 0.8 && styles.frameButtonDisabled]}
                onPress={() => adjustFrameSize(true)}
                disabled={overlayScale >= 0.8}
              >
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Zoom Controls */}
          <View style={styles.zoomContainer}>
            <Text style={styles.controlLabel}>
              Zoom: {Math.round(zoom * 100)}%
            </Text>
            <Slider
              style={styles.zoomSlider}
              minimumValue={0}
              maximumValue={0.5}
              step={0.01}
              value={zoom}
              onValueChange={setZoom}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
              thumbStyle={styles.sliderThumb}
            />
          </View>

          <View style={styles.captureButtonContainer}>
            <TouchableOpacity
              onPress={takePicture}
              disabled={isCapturing}
              style={styles.captureButtonWrapper}
            >
              <LinearGradient
                colors={isCapturing ? ['#666', '#666'] : theme.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.captureButton,
                  isCapturing && styles.captureButtonDisabled
                ]}
              >
                <View style={styles.captureButtonInner}>
                  {isCapturing ? (
                    <Text style={styles.captureButtonText}>Processing...</Text>
                  ) : (
                    <Ionicons name="camera" size={36} color="white" />
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      {/* Preview Screen */}
      {showPreview && previewImage && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: previewImage }} style={styles.previewImage} />

          {/* Preview Overlay */}
          <View style={styles.previewOverlay}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Photo Preview</Text>
              <Text style={styles.previewTimer}>Auto-proceeding in 5 seconds...</Text>
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Ionicons name="camera" size={20} color="white" />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.usePhotoButton}
                onPress={() => handleUsePhoto()}
              >
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.usePhotoButtonText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploadIconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashModeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: (screenHeight - Math.min(screenWidth, screenHeight) * 0.6) / 2,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: (screenHeight - Math.min(screenWidth, screenHeight) * 0.6) / 2,
  },
  overlayMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: Math.min(screenWidth, screenHeight) * 0.8, // Adjust for variable overlay size
  },
  overlaySide: {
    flex: 1,
    height: '100%',
  },
  squareOverlay: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cornerBracket: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
    borderWidth: 3,
  },
  topLeft: {
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: -3,
    right: -3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: -3,
    left: -3,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: -3,
    right: -3,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  squareInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  instructionTip: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  captureButtonContainer: {
    alignItems: 'center',
  },
  captureButtonWrapper: {
    borderRadius: 45,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  zoomContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  controlLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  zoomSlider: {
    width: 200,
    height: 40,
  },
  sliderThumb: {
    backgroundColor: 'white',
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Frame size control styles
  frameSizeContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  frameSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
  },
  frameButtonDisabled: {
    opacity: 0.4,
  },
  frameSizeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Preview screen styles
  previewContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 1000,
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  previewTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewTimer: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'center',
  },
  retakeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  usePhotoButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    justifyContent: 'center',
  },
  usePhotoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Real-time detection overlay styles
  detectionOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detectionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  detectionResultBadge: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  detectionResultGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  detectionResultContent: {
    marginLeft: 10,
  },
  detectionShapeText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    textTransform: 'capitalize',
  },
  detectionConfidenceText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
});
