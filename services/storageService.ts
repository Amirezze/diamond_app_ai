/**
 * Storage Service
 *
 * Handles persisting diamond scan history to AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_STORAGE_KEY = '@diamond_app:history';

export interface HistoryItem {
  id: string;
  timestamp: number;
  imageUri: string;
  cutGrade: string;
  cutConfidence: number;
  colorGrade?: string; // Optional: color grade
  colorConfidence?: number; // Optional: color confidence
  colorAllProbabilities?: Record<string, number>; // Optional: color probabilities
  clarityGrade?: string; // Optional: clarity grade
  clarityConfidence?: number; // Optional: clarity confidence
  clarityAllProbabilities?: Record<string, number>; // Optional: clarity probabilities
  shape: string;
  shapeConfidence: number;
  allProbabilities: Record<string, number>;
  estimatedPrice: number;
  caratWeight?: number; // Optional for backward compatibility with old history items
  // Real-time pricing data from OpenFacet
  pricingData?: {
    perCaratPrice: number;
    totalPrice: number;
    priceRange: {
      min: number;
      max: number;
    };
    dcxIndex: number;
    trend24h: number;
    confidence: number;
    marketDepth?: number;
    timestamp: number;
  };
}

/**
 * Save history to AsyncStorage
 */
export async function saveHistory(history: HistoryItem[]): Promise<void> {
  try {
    const jsonValue = JSON.stringify(history);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, jsonValue);
    console.log('✅ History saved to AsyncStorage:', history.length, 'items');
  } catch (error) {
    console.error('❌ Error saving history to AsyncStorage:', error);
    throw error;
  }
}

/**
 * Load history from AsyncStorage
 */
export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const jsonValue = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    if (jsonValue != null) {
      const history = JSON.parse(jsonValue);
      console.log('✅ History loaded from AsyncStorage:', history.length, 'items');
      return history;
    }
    console.log('ℹ️ No history found in AsyncStorage');
    return [];
  } catch (error) {
    console.error('❌ Error loading history from AsyncStorage:', error);
    return [];
  }
}

/**
 * Clear all history from AsyncStorage
 */
export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
    console.log('✅ History cleared from AsyncStorage');
  } catch (error) {
    console.error('❌ Error clearing history from AsyncStorage:', error);
    throw error;
  }
}

/**
 * Remove a specific item from history
 */
export async function removeHistoryItem(itemId: string): Promise<void> {
  try {
    const history = await loadHistory();
    const filteredHistory = history.filter(item => item.id !== itemId);
    await saveHistory(filteredHistory);
    console.log('✅ History item removed:', itemId);
  } catch (error) {
    console.error('❌ Error removing history item:', error);
    throw error;
  }
}
