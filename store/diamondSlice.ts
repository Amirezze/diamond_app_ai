import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { detectDiamondShape, predictDiamondCut, predictDiamondColor, analyzeDiamond } from '../services/diamondAPI';
import { HistoryItem, loadHistory, saveHistory } from '../services/storageService';
import { calculateDiamondPrice, DiamondPriceQuote } from '../services/pricingService';

// Helper function to calculate estimated price based on cut grade
function calculateEstimatedPrice(cutGrade: string, confidence: number): number {
  const grade = cutGrade.toUpperCase();
  let basePrice = 5000; // Base price in USD

  // Adjust price based on cut grade
  if (grade.includes('EX')) {
    basePrice = 8000 + (confidence * 20); // Excellent: $8000-$10000
  } else if (grade.includes('VG')) {
    basePrice = 6000 + (confidence * 15); // Very Good: $6000-$7500
  } else if (grade.includes('GD') || grade.includes('GOOD')) {
    basePrice = 4000 + (confidence * 10); // Good: $4000-$5000
  } else if (grade.includes('F') || grade.includes('FAIR')) {
    basePrice = 2500 + (confidence * 8); // Fair: $2500-$3300
  } else {
    basePrice = 1500 + (confidence * 5); // Poor: $1500-$2000
  }

  // Round to nearest hundred
  return Math.round(basePrice / 100) * 100;
}

interface CutPrediction {
  id: string;
  timestamp: number;
  imageUri: string;
  cutGrade: string;
  confidence: number;
  allProbabilities: Record<string, number>;
}

interface ColorPrediction {
  id: string;
  timestamp: number;
  imageUri: string;
  colorGrade: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  giaGrades?: string;
  description?: string;
}

interface ClarityPrediction {
  id: string;
  timestamp: number;
  imageUri: string;
  clarityGrade: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  description?: string;
}

interface ShapeDetection {
  shape: string;
  confidence: number;
  timestamp: number;
}

interface CaratPrediction {
  id: string;
  timestamp: number;
  imageUri: string;
  caratWeight: number;
  source: 'ml' | 'manual'; // Track whether from ML prediction or manual input
  confidence?: number; // Optional: only present for ML predictions
  predictedRange?: { // Optional: confidence range for ML predictions
    min: number;
    max: number;
  };
}

interface DiamondState {
  imageData: string | null;
  // Cut prediction state
  cutPrediction: CutPrediction | null;
  isPredictingCut: boolean;
  cutPredictionError: string | null;
  // Color prediction state
  colorPrediction: ColorPrediction | null;
  isPredictingColor: boolean;
  colorPredictionError: string | null;
  // Clarity prediction state
  clarityPrediction: ClarityPrediction | null;
  isPredictingClarity: boolean;
  clarityPredictionError: string | null;
  // Shape detection state
  shapeDetection: ShapeDetection | null;
  isDetectingShape: boolean;
  shapeDetectionError: string | null;
  // Carat prediction state
  caratPrediction: CaratPrediction | null;
  isPredictingCarat: boolean;
  caratPredictionError: string | null;
  // Pricing state
  pricingData: DiamondPriceQuote | null;
  isPricingLoading: boolean;
  pricingError: string | null;
  // History state
  history: HistoryItem[];
  isLoadingHistory: boolean;
}

const initialState: DiamondState = {
  imageData: null,
  cutPrediction: null,
  isPredictingCut: false,
  cutPredictionError: null,
  colorPrediction: null,
  isPredictingColor: false,
  colorPredictionError: null,
  clarityPrediction: null,
  isPredictingClarity: false,
  clarityPredictionError: null,
  shapeDetection: null,
  isDetectingShape: false,
  shapeDetectionError: null,
  caratPrediction: null,
  isPredictingCarat: false,
  caratPredictionError: null,
  pricingData: null,
  isPricingLoading: false,
  pricingError: null,
  history: [],
  isLoadingHistory: false,
};

// Async thunk for predicting diamond cut
export const predictCut = createAsyncThunk(
  'diamond/predictCut',
  async (
    { imageUri, base64Data }: { imageUri: string; base64Data?: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await predictDiamondCut(imageUri, base64Data);
      return {
        imageUri,
        ...result,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to predict diamond cut');
    }
  }
);

// Async thunk for predicting diamond color
export const predictColor = createAsyncThunk(
  'diamond/predictColor',
  async (
    { imageUri, base64Data }: { imageUri: string; base64Data?: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await predictDiamondColor(imageUri, base64Data);
      return {
        imageUri,
        ...result,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to predict diamond color');
    }
  }
);

// Async thunk for detecting diamond shape
export const detectShape = createAsyncThunk(
  'diamond/detectShape',
  async (
    { base64Data }: { base64Data: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await detectDiamondShape(base64Data);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to detect diamond shape');
    }
  }
);

// Async thunk for combined shape + color analysis using Hugging Face model
export const analyzeShapeAndColor = createAsyncThunk(
  'diamond/analyzeShapeAndColor',
  async (
    { imageUri, base64Data }: { imageUri: string; base64Data?: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await analyzeDiamond(imageUri, base64Data);
      console.log('🔍 analyzeShapeAndColor thunk - full result:', result);
      console.log('🔍 analyzeShapeAndColor thunk - clarity:', result.clarity);
      return {
        imageUri,
        shape: result.shape,
        color: result.color,
        clarity: result.clarity,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to analyze diamond shape and color');
    }
  }
);

// Async thunk for loading history from storage
export const loadHistoryFromStorage = createAsyncThunk(
  'diamond/loadHistory',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { diamond: DiamondState; auth: { isAuthenticated: boolean; user: { uid: string } | null } };

      // Check if user is authenticated
      if (!state.auth.isAuthenticated || !state.auth.user) {
        console.log('⚠️ User not authenticated - returning empty history');
        return [];
      }

      // Load from Firestore if authenticated
      console.log('📥 Loading history from Firestore for user:', state.auth.user.uid);
      const { loadScans } = await import('../services/firestoreService');
      const history = await loadScans(state.auth.user.uid);
      console.log(`✅ Loaded ${history.length} scans from Firestore`);
      return history;
    } catch (error: any) {
      console.error('❌ Error loading history:', error.message);
      return rejectWithValue(error.message || 'Failed to load history');
    }
  }
);

// Async thunk for saving current scan to history
export const saveToHistory = createAsyncThunk(
  'diamond/saveToHistory',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { diamond: DiamondState; auth: { isAuthenticated: boolean; user: { uid: string } | null } };
      const { cutPrediction, colorPrediction, clarityPrediction, shapeDetection, caratPrediction, pricingData } = state.diamond;

      // Check if user is authenticated
      if (!state.auth.isAuthenticated || !state.auth.user) {
        console.log('⚠️ User not authenticated - cannot save');
        return rejectWithValue('AUTH_REQUIRED');
      }

      if (!cutPrediction || !shapeDetection) {
        throw new Error('No scan data to save');
      }

      // Calculate estimated price based on cut grade (simplified estimation - fallback if pricing API fails)
      const estimatedPrice = pricingData?.totalPrice || calculateEstimatedPrice(cutPrediction.cutGrade, cutPrediction.confidence);

      const historyItem: HistoryItem = {
        id: cutPrediction.id,
        timestamp: cutPrediction.timestamp,
        imageUri: cutPrediction.imageUri, // Local URI (not uploaded to Storage - free tier)
        cutGrade: cutPrediction.cutGrade,
        cutConfidence: cutPrediction.confidence,
        colorGrade: colorPrediction?.colorGrade,
        colorConfidence: colorPrediction?.confidence,
        colorAllProbabilities: colorPrediction?.allProbabilities,
        clarityGrade: clarityPrediction?.clarityGrade,
        clarityConfidence: clarityPrediction?.confidence,
        clarityAllProbabilities: clarityPrediction?.allProbabilities,
        shape: shapeDetection.shape,
        shapeConfidence: shapeDetection.confidence,
        allProbabilities: cutPrediction.allProbabilities,
        estimatedPrice,
        caratWeight: caratPrediction?.caratWeight,
        pricingData: pricingData ? {
          perCaratPrice: pricingData.perCaratPrice,
          totalPrice: pricingData.totalPrice,
          priceRange: pricingData.priceRange,
          dcxIndex: pricingData.dcxIndex,
          trend24h: pricingData.trend24h,
          confidence: pricingData.confidence,
          marketDepth: pricingData.marketDepth,
          timestamp: pricingData.timestamp,
        } : undefined,
      };

      // Save to Firestore (cloud database)
      console.log('💾 Saving scan to Firestore for user:', state.auth.user.uid);
      const { saveScan } = await import('../services/firestoreService');
      await saveScan(state.auth.user.uid, historyItem);

      // Also update local state
      const currentHistory = state.diamond.history;
      const newHistory = [historyItem, ...currentHistory].slice(0, 50);

      console.log('✅ Scan saved successfully');
      return newHistory;
    } catch (error: any) {
      console.error('❌ Error saving scan:', error.message);
      return rejectWithValue(error.message || 'Failed to save to history');
    }
  }
);

// Async thunk for deleting history item
export const deleteHistoryItem = createAsyncThunk(
  'diamond/deleteHistoryItem',
  async (itemId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { diamond: DiamondState; auth: { isAuthenticated: boolean; user: { uid: string } | null } };

      // Check if user is authenticated
      if (!state.auth.isAuthenticated || !state.auth.user) {
        return rejectWithValue('AUTH_REQUIRED');
      }

      // Delete from Firestore
      console.log('🗑️ Deleting scan from Firestore:', itemId);
      const { deleteScan } = await import('../services/firestoreService');
      await deleteScan(state.auth.user.uid, itemId);

      console.log('✅ Scan deleted successfully');
      return itemId;
    } catch (error: any) {
      console.error('❌ Error deleting scan:', error.message);
      return rejectWithValue(error.message || 'Failed to delete history item');
    }
  }
);

// Async thunk for clearing all history
export const clearAllHistory = createAsyncThunk(
  'diamond/clearAllHistory',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { diamond: DiamondState; auth: { isAuthenticated: boolean; user: { uid: string } | null } };

      // Check if user is authenticated
      if (!state.auth.isAuthenticated || !state.auth.user) {
        return rejectWithValue('AUTH_REQUIRED');
      }

      // Clear from Firestore
      console.log('🗑️ Clearing all scans from Firestore');
      const { clearAllScans } = await import('../services/firestoreService');
      await clearAllScans(state.auth.user.uid);

      console.log('✅ All scans cleared successfully');
      return;
    } catch (error: any) {
      console.error('❌ Error clearing scans:', error.message);
      return rejectWithValue(error.message || 'Failed to clear history');
    }
  }
);

// Async thunk for fetching diamond price
export const fetchDiamondPrice = createAsyncThunk(
  'diamond/fetchPrice',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { diamond: DiamondState };
      const { caratPrediction, colorPrediction, shapeDetection, clarityPrediction } = state.diamond;

      // Validate required data
      if (!caratPrediction) {
        throw new Error('Carat weight is required for pricing');
      }
      if (!colorPrediction) {
        throw new Error('Color grade is required for pricing');
      }
      if (!shapeDetection) {
        throw new Error('Shape detection is required for pricing');
      }

      // Map clarity category to GIA grade for pricing
      const mapClarityToGIA = (clarityCategory?: string): string | undefined => {
        if (!clarityCategory) return undefined;
        const clarityMap: Record<string, string> = {
          'High Clarity': 'VVS2',    // FL-VVS2 range → use VVS2
          'Medium Clarity': 'VS2',   // VS1-SI1 range → use VS2
          'Low Clarity': 'SI2',      // SI2-I3 range → use SI2
        };
        return clarityMap[clarityCategory];
      };

      const clarityForPricing = mapClarityToGIA(clarityPrediction?.clarityGrade);

      console.log('💰 Fetching diamond price with:', {
        carat: caratPrediction.caratWeight,
        color: colorPrediction.colorGrade,
        shape: shapeDetection.shape,
        clarity: clarityForPricing || 'VS2 (default)',
      });

      const priceQuote = await calculateDiamondPrice(
        caratPrediction.caratWeight,
        colorPrediction.colorGrade,
        shapeDetection.shape,
        clarityForPricing // Pass mapped GIA clarity grade
      );

      return priceQuote;
    } catch (error: any) {
      console.error('❌ Error fetching diamond price:', error.message);
      return rejectWithValue(error.message || 'Failed to fetch diamond price');
    }
  }
);

const diamondSlice = createSlice({
  name: 'diamond',
  initialState,
  reducers: {
    setImageData: (state, action: PayloadAction<string>) => {
      state.imageData = action.payload;
    },
    clearData: (state) => {
      state.imageData = null;
    },
    clearPrediction: (state) => {
      state.cutPrediction = null;
      state.isPredictingCut = false;
      state.cutPredictionError = null;
    },
    clearShapeDetection: (state) => {
      state.shapeDetection = null;
      state.isDetectingShape = false;
      state.shapeDetectionError = null;
    },
    clearColorPrediction: (state) => {
      state.colorPrediction = null;
      state.isPredictingColor = false;
      state.colorPredictionError = null;
    },
    setManualCaratWeight: (state, action: PayloadAction<{ caratWeight: number; imageUri: string }>) => {
      // Create a CaratPrediction from manual input
      state.caratPrediction = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        imageUri: action.payload.imageUri,
        caratWeight: action.payload.caratWeight,
        source: 'manual',
      };
    },
    clearCaratPrediction: (state) => {
      state.caratPrediction = null;
      state.isPredictingCarat = false;
      state.caratPredictionError = null;
    },
    clearPricingData: (state) => {
      state.pricingData = null;
      state.isPricingLoading = false;
      state.pricingError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle predictCut pending
      .addCase(predictCut.pending, (state) => {
        state.isPredictingCut = true;
        state.cutPredictionError = null;
        state.cutPrediction = null;
      })
      // Handle predictCut fulfilled
      .addCase(predictCut.fulfilled, (state, action) => {
        state.isPredictingCut = false;
        state.cutPredictionError = null;

        // Create new prediction with unique ID
        const newPrediction: CutPrediction = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUri: action.payload.imageUri,
          cutGrade: action.payload.cutGrade,
          confidence: action.payload.confidence,
          allProbabilities: action.payload.allProbabilities,
        };

        state.cutPrediction = newPrediction;
      })
      // Handle predictCut rejected
      .addCase(predictCut.rejected, (state, action) => {
        state.isPredictingCut = false;
        state.cutPredictionError = action.payload as string;
        state.cutPrediction = null;
      })
      // Handle detectShape pending
      .addCase(detectShape.pending, (state) => {
        state.isDetectingShape = true;
        state.shapeDetectionError = null;
        state.shapeDetection = null;
      })
      // Handle detectShape fulfilled
      .addCase(detectShape.fulfilled, (state, action) => {
        state.isDetectingShape = false;
        state.shapeDetectionError = null;
        state.shapeDetection = {
          shape: action.payload.shape,
          confidence: action.payload.confidence,
          timestamp: Date.now(),
        };
      })
      // Handle detectShape rejected
      .addCase(detectShape.rejected, (state, action) => {
        state.isDetectingShape = false;
        state.shapeDetectionError = action.payload as string;
        state.shapeDetection = null;
      })
      // Handle analyzeShapeAndColor pending (sets shape, color, and clarity to loading)
      .addCase(analyzeShapeAndColor.pending, (state) => {
        state.isDetectingShape = true;
        state.isPredictingColor = true;
        state.isPredictingClarity = true;
        state.shapeDetectionError = null;
        state.colorPredictionError = null;
        state.clarityPredictionError = null;
        state.shapeDetection = null;
        state.colorPrediction = null;
        state.clarityPrediction = null;
      })
      // Handle analyzeShapeAndColor fulfilled (updates shape, color, and clarity)
      .addCase(analyzeShapeAndColor.fulfilled, (state, action) => {
        console.log('🔍 Reducer - action.payload:', action.payload);
        console.log('🔍 Reducer - action.payload.clarity:', action.payload.clarity);

        state.isDetectingShape = false;
        state.isPredictingColor = false;
        state.isPredictingClarity = false;
        state.shapeDetectionError = null;
        state.colorPredictionError = null;
        state.clarityPredictionError = null;

        // Update shape detection
        state.shapeDetection = {
          shape: action.payload.shape.shape,
          confidence: action.payload.shape.confidence,
          timestamp: Date.now(),
        };

        // Update color prediction
        const newColorPrediction: ColorPrediction = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUri: action.payload.imageUri,
          colorGrade: action.payload.color.colorGrade,
          confidence: action.payload.color.confidence,
          allProbabilities: action.payload.color.allProbabilities,
          giaGrades: action.payload.color.giaGrades,
          description: action.payload.color.description,
        };

        state.colorPrediction = newColorPrediction;

        // Update clarity prediction (if available)
        if (action.payload.clarity) {
          const newClarityPrediction: ClarityPrediction = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            imageUri: action.payload.imageUri,
            clarityGrade: action.payload.clarity.clarityGrade,
            confidence: action.payload.clarity.confidence,
            allProbabilities: action.payload.clarity.allProbabilities,
            description: action.payload.clarity.description,
          };

          state.clarityPrediction = newClarityPrediction;
        } else {
          console.log('⚠️ No clarity data in API response');
        }
      })
      // Handle analyzeShapeAndColor rejected (clears shape, color, and clarity)
      .addCase(analyzeShapeAndColor.rejected, (state, action) => {
        state.isDetectingShape = false;
        state.isPredictingColor = false;
        state.isPredictingClarity = false;
        state.shapeDetectionError = action.payload as string;
        state.colorPredictionError = action.payload as string;
        state.clarityPredictionError = action.payload as string;
        state.shapeDetection = null;
        state.colorPrediction = null;
        state.clarityPrediction = null;
      })
      // Handle predictColor pending
      .addCase(predictColor.pending, (state) => {
        state.isPredictingColor = true;
        state.colorPredictionError = null;
        state.colorPrediction = null;
      })
      // Handle predictColor fulfilled
      .addCase(predictColor.fulfilled, (state, action) => {
        state.isPredictingColor = false;
        state.colorPredictionError = null;

        // Create new prediction with unique ID
        const newPrediction: ColorPrediction = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUri: action.payload.imageUri,
          colorGrade: action.payload.colorGrade,
          confidence: action.payload.confidence,
          allProbabilities: action.payload.allProbabilities,
          giaGrades: action.payload.giaGrades,
          description: action.payload.description,
        };

        state.colorPrediction = newPrediction;
      })
      // Handle predictColor rejected
      .addCase(predictColor.rejected, (state, action) => {
        state.isPredictingColor = false;
        state.colorPredictionError = action.payload as string;
        state.colorPrediction = null;
      })
      // Handle loadHistoryFromStorage
      .addCase(loadHistoryFromStorage.pending, (state) => {
        state.isLoadingHistory = true;
      })
      .addCase(loadHistoryFromStorage.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        state.history = action.payload;
      })
      .addCase(loadHistoryFromStorage.rejected, (state) => {
        state.isLoadingHistory = false;
        state.history = [];
      })
      // Handle saveToHistory
      .addCase(saveToHistory.fulfilled, (state, action) => {
        state.history = action.payload;
      })
      // Handle deleteHistoryItem
      .addCase(deleteHistoryItem.fulfilled, (state, action) => {
        state.history = state.history.filter(item => item.id !== action.payload);
      })
      // Handle clearAllHistory
      .addCase(clearAllHistory.fulfilled, (state) => {
        state.history = [];
      })
      // Handle fetchDiamondPrice pending
      .addCase(fetchDiamondPrice.pending, (state) => {
        state.isPricingLoading = true;
        state.pricingError = null;
      })
      // Handle fetchDiamondPrice fulfilled
      .addCase(fetchDiamondPrice.fulfilled, (state, action) => {
        state.isPricingLoading = false;
        state.pricingError = null;
        state.pricingData = action.payload;
      })
      // Handle fetchDiamondPrice rejected
      .addCase(fetchDiamondPrice.rejected, (state, action) => {
        state.isPricingLoading = false;
        state.pricingError = action.payload as string;
        state.pricingData = null;
      });
  },
});

export const {
  setImageData,
  clearData,
  clearPrediction,
  clearShapeDetection,
  clearColorPrediction,
  setManualCaratWeight,
  clearCaratPrediction,
  clearPricingData,
} = diamondSlice.actions;

export const diamondReducer = diamondSlice.reducer;

