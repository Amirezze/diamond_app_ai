/**
 * OpenFacet Diamond Pricing API Client
 *
 * Provides real-time diamond pricing data from OpenFacet.net
 * - Price matrices for interpolation
 * - DCX (Diamond Composite Index)
 * - Market depth/liquidity data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://data.openfacet.net';
const CACHE_EXPIRY_HOURS = 24; // OpenFacet updates once per 24h

// Cache keys
const CACHE_KEYS = {
  MATRIX: '@diamond_pricing:matrix',
  INDEX: '@diamond_pricing:index',
  DEPTH: '@diamond_pricing:depth',
};

export interface DCXIndexResponse {
  dcx: number; // Composite per-carat price in USD
  specs: Array<{
    carat: number;
    clarity: string;
    color: string;
    cut: string;
    log: number;
    per_carat: number;
    price: number;
    weight: number;
  }>;
  trend: number; // 24h change in percent (e.g., 0.13 = +0.13%)
  ts: string; // Timestamp in ISO 8601 format
}

export interface PriceMatrixResponse {
  l: Record<string, number[]>; // Map of carat band → flat array of log(per-carat price)
  c: string[]; // Clarity grade list (columns)
  r: string[]; // Color grade list (rows)
  s: [number, number]; // Shape [rows, cols] = [len(r), len(c)]
  ts: string; // Timestamp
}

export interface MarketDepthResponse {
  clarity: Record<string, Record<string, number>>; // [carat][clarity] → count
  color: Record<string, Record<string, number>>; // [carat][color] → count
  colclar: Record<string, Record<string, number>>; // [color][clarity] → count
  ts: string;
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid<T>(cached: CachedData<T> | null): boolean {
  if (!cached) return false;
  return Date.now() < cached.expiresAt;
}

/**
 * Create cache entry with expiry
 */
function createCacheEntry<T>(data: T): CachedData<T> {
  const now = Date.now();
  return {
    data,
    timestamp: now,
    expiresAt: now + CACHE_EXPIRY_HOURS * 60 * 60 * 1000,
  };
}

/**
 * Fetch DCX index data (composite market index and trends)
 */
export async function fetchDCXIndex(forceRefresh = false): Promise<DCXIndexResponse> {
  try {
    // Check cache first
    if (!forceRefresh) {
      const cachedJson = await AsyncStorage.getItem(CACHE_KEYS.INDEX);
      if (cachedJson) {
        const cached: CachedData<DCXIndexResponse> = JSON.parse(cachedJson);
        if (isCacheValid(cached)) {
          console.log('✅ Using cached DCX index');
          return cached.data;
        }
      }
    }

    console.log('🌐 Fetching DCX index from OpenFacet...');
    const response = await fetch(`${BASE_URL}/index.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DCX index: ${response.status} ${response.statusText}`);
    }

    const data: DCXIndexResponse = await response.json();
    console.log('✅ DCX index fetched:', {
      dcx: data.dcx,
      trend: data.trend,
      timestamp: data.ts,
    });

    // Cache the response
    const cacheEntry = createCacheEntry(data);
    await AsyncStorage.setItem(CACHE_KEYS.INDEX, JSON.stringify(cacheEntry));

    return data;
  } catch (error: any) {
    console.error('❌ Error fetching DCX index:', error.message);

    // Try to return cached data even if expired
    const cachedJson = await AsyncStorage.getItem(CACHE_KEYS.INDEX);
    if (cachedJson) {
      const cached: CachedData<DCXIndexResponse> = JSON.parse(cachedJson);
      console.log('⚠️ Using stale cached DCX index');
      return cached.data;
    }

    throw new Error('Failed to fetch DCX index and no cached data available');
  }
}

/**
 * Fetch price matrix data for interpolation
 */
export async function fetchPriceMatrix(forceRefresh = false): Promise<PriceMatrixResponse> {
  try {
    // Check cache first
    if (!forceRefresh) {
      const cachedJson = await AsyncStorage.getItem(CACHE_KEYS.MATRIX);
      if (cachedJson) {
        const cached: CachedData<PriceMatrixResponse> = JSON.parse(cachedJson);
        if (isCacheValid(cached)) {
          console.log('✅ Using cached price matrix');
          return cached.data;
        }
      }
    }

    console.log('🌐 Fetching price matrix from OpenFacet...');
    const response = await fetch(`${BASE_URL}/matrix.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch price matrix: ${response.status} ${response.statusText}`);
    }

    const data: PriceMatrixResponse = await response.json();
    console.log('✅ Price matrix fetched:', {
      caratBands: Object.keys(data.l).length,
      clarityGrades: data.c.length,
      colorGrades: data.r.length,
      timestamp: data.ts,
    });

    // Cache the response
    const cacheEntry = createCacheEntry(data);
    await AsyncStorage.setItem(CACHE_KEYS.MATRIX, JSON.stringify(cacheEntry));

    return data;
  } catch (error: any) {
    console.error('❌ Error fetching price matrix:', error.message);

    // Try to return cached data even if expired
    const cachedJson = await AsyncStorage.getItem(CACHE_KEYS.MATRIX);
    if (cachedJson) {
      const cached: CachedData<PriceMatrixResponse> = JSON.parse(cachedJson);
      console.log('⚠️ Using stale cached price matrix');
      return cached.data;
    }

    throw new Error('Failed to fetch price matrix and no cached data available');
  }
}

/**
 * Fetch market depth data (inventory counts)
 */
export async function fetchMarketDepth(forceRefresh = false): Promise<MarketDepthResponse> {
  try {
    // Check cache first
    if (!forceRefresh) {
      const cachedJson = await AsyncStorage.getItem(CACHE_KEYS.DEPTH);
      if (cachedJson) {
        const cached: CachedData<MarketDepthResponse> = JSON.parse(cachedJson);
        if (isCacheValid(cached)) {
          console.log('✅ Using cached market depth');
          return cached.data;
        }
      }
    }

    console.log('🌐 Fetching market depth from OpenFacet...');
    const response = await fetch(`${BASE_URL}/depth.json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch market depth: ${response.status} ${response.statusText}`);
    }

    const data: MarketDepthResponse = await response.json();
    console.log('✅ Market depth fetched');

    // Cache the response
    const cacheEntry = createCacheEntry(data);
    await AsyncStorage.setItem(CACHE_KEYS.DEPTH, JSON.stringify(cacheEntry));

    return data;
  } catch (error: any) {
    console.error('❌ Error fetching market depth:', error.message);

    // Try to return cached data even if expired
    const cachedJson = await AsyncStorage.getItem(CACHE_KEYS.DEPTH);
    if (cachedJson) {
      const cached: CachedData<MarketDepthResponse> = JSON.parse(cachedJson);
      console.log('⚠️ Using stale cached market depth');
      return cached.data;
    }

    throw new Error('Failed to fetch market depth and no cached data available');
  }
}

/**
 * Clear all cached pricing data
 */
export async function clearPricingCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.MATRIX,
      CACHE_KEYS.INDEX,
      CACHE_KEYS.DEPTH,
    ]);
    console.log('✅ Pricing cache cleared');
  } catch (error: any) {
    console.error('❌ Error clearing pricing cache:', error.message);
    throw error;
  }
}

/**
 * Get cache status for all pricing data
 */
export async function getCacheStatus(): Promise<{
  matrix: { cached: boolean; age?: number };
  index: { cached: boolean; age?: number };
  depth: { cached: boolean; age?: number };
}> {
  const status = {
    matrix: { cached: false, age: undefined as number | undefined },
    index: { cached: false, age: undefined as number | undefined },
    depth: { cached: false, age: undefined as number | undefined },
  };

  try {
    const matrixJson = await AsyncStorage.getItem(CACHE_KEYS.MATRIX);
    if (matrixJson) {
      const cached: CachedData<any> = JSON.parse(matrixJson);
      status.matrix.cached = true;
      status.matrix.age = Math.floor((Date.now() - cached.timestamp) / (60 * 60 * 1000)); // hours
    }

    const indexJson = await AsyncStorage.getItem(CACHE_KEYS.INDEX);
    if (indexJson) {
      const cached: CachedData<any> = JSON.parse(indexJson);
      status.index.cached = true;
      status.index.age = Math.floor((Date.now() - cached.timestamp) / (60 * 60 * 1000));
    }

    const depthJson = await AsyncStorage.getItem(CACHE_KEYS.DEPTH);
    if (depthJson) {
      const cached: CachedData<any> = JSON.parse(depthJson);
      status.depth.cached = true;
      status.depth.age = Math.floor((Date.now() - cached.timestamp) / (60 * 60 * 1000));
    }
  } catch (error) {
    console.error('Error checking cache status:', error);
  }

  return status;
}
