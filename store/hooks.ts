import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useDiamondState = () => {
  return useAppSelector((state) => state.diamond);
};

export const useDiamondImage = () => {
  return useAppSelector((state) => state.diamond.imageData);
};

// Cut prediction hooks
export const useCutPrediction = () => {
  return useAppSelector((state) => state.diamond.cutPrediction);
};

export const useIsPredictingCut = () => {
  return useAppSelector((state) => state.diamond.isPredictingCut);
};

export const useCutPredictionError = () => {
  return useAppSelector((state) => state.diamond.cutPredictionError);
};

// Color prediction hooks
export const useColorPrediction = () => {
  return useAppSelector((state) => state.diamond.colorPrediction);
};

export const useIsPredictingColor = () => {
  return useAppSelector((state) => state.diamond.isPredictingColor);
};

export const useColorPredictionError = () => {
  return useAppSelector((state) => state.diamond.colorPredictionError);
};

// Shape detection hooks
export const useShapeDetection = () => {
  return useAppSelector((state) => state.diamond.shapeDetection);
};

export const useIsDetectingShape = () => {
  return useAppSelector((state) => state.diamond.isDetectingShape);
};

export const useShapeDetectionError = () => {
  return useAppSelector((state) => state.diamond.shapeDetectionError);
};

// Carat prediction hooks
export const useCaratPrediction = () => {
  return useAppSelector((state) => state.diamond.caratPrediction);
};

export const useIsPredictingCarat = () => {
  return useAppSelector((state) => state.diamond.isPredictingCarat);
};

export const useCaratPredictionError = () => {
  return useAppSelector((state) => state.diamond.caratPredictionError);
};

// Clarity prediction hooks
export const useClarityPrediction = () => {
  return useAppSelector((state) => state.diamond.clarityPrediction);
};

export const useIsPredictingClarity = () => {
  return useAppSelector((state) => state.diamond.isPredictingClarity);
};

export const useClarityPredictionError = () => {
  return useAppSelector((state) => state.diamond.clarityPredictionError);
};

// History hooks
export const useHistory = () => {
  return useAppSelector((state) => state.diamond.history);
};

export const useIsLoadingHistory = () => {
  return useAppSelector((state) => state.diamond.isLoadingHistory);
};

// Auth hooks
export const useAuth = () => {
  return useAppSelector((state) => state.auth);
};

export const useUser = () => {
  return useAppSelector((state) => state.auth.user);
};

export const useUserProfile = () => {
  return useAppSelector((state) => state.auth.profile);
};

export const useIsAuthenticated = () => {
  return useAppSelector((state) => state.auth.isAuthenticated);
};

export const useAuthLoading = () => {
  return useAppSelector((state) => state.auth.isLoading);
};

export const useAuthInitializing = () => {
  return useAppSelector((state) => state.auth.isInitializing);
};

export const useAuthError = () => {
  return useAppSelector((state) => state.auth.error);
};