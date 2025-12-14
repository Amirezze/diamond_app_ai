/**
 * Custom hook for react-native-vision-camera setup
 * Handles device selection, format optimization, and permission management
 */

import { useCameraDevice, useCameraFormat } from 'react-native-vision-camera';
import { useMemo } from 'react';

interface CameraSetupOptions {
  /**
   * Preferred aspect ratio for photo capture
   * @default 4/3
   */
  aspectRatio?: number;

  /**
   * Target position ('back' or 'front')
   * @default 'back'
   */
  position?: 'back' | 'front';
}

interface CameraSetup {
  device: ReturnType<typeof useCameraDevice>;
  format: ReturnType<typeof useCameraFormat>;
  isReady: boolean;
  formatInfo: {
    width: number;
    height: number;
    megapixels: number;
  } | null;
}

/**
 * Hook to setup camera device and optimal format for ML image capture
 *
 * @example
 * const { device, format, isReady, formatInfo } = useCameraSetup();
 *
 * if (!isReady) return <LoadingScreen />;
 *
 * return (
 *   <Camera device={device} format={format} />
 * );
 */
export const useCameraSetup = (options: CameraSetupOptions = {}): CameraSetup => {
  const { aspectRatio = 4 / 3, position = 'back' } = options;

  // Select camera device
  const device = useCameraDevice(position);

  // Select best photo format
  // Priority: highest resolution, then matching aspect ratio
  const format = useCameraFormat(device, [
    { photoResolution: 'max' },
    { photoAspectRatio: aspectRatio },
  ]);

  // Calculate format info
  const formatInfo = useMemo(() => {
    if (!format) return null;

    const width = format.photoWidth ?? 0;
    const height = format.photoHeight ?? 0;
    const megapixels = Math.round((width * height) / 1_000_000);

    return { width, height, megapixels };
  }, [format]);

  const isReady = Boolean(device && format);

  return {
    device,
    format,
    isReady,
    formatInfo,
  };
};

/**
 * Helper to calculate optimal zoom constraints based on device
 */
export const useZoomConstraints = (device: ReturnType<typeof useCameraDevice>) => {
  return useMemo(() => {
    if (!device) {
      return { min: 1, neutral: 1, max: 1 };
    }

    const min = device.minZoom ?? 1;
    const neutral = device.neutralZoom ?? 1;
    const deviceMax = device.maxZoom ?? 1;

    // Cap max zoom at 4× to prevent quality loss
    const max = Math.min(deviceMax, 4.0);

    return { min, neutral, max };
  }, [device]);
};
