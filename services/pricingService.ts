/**
 * Diamond Pricing Service
 *
 * Calculates real-time diamond prices using OpenFacet API data
 * with logarithmic interpolation for non-standard carat weights
 */

import {
  fetchDCXIndex,
  fetchPriceMatrix,
  fetchMarketDepth,
  DCXIndexResponse,
  PriceMatrixResponse,
  MarketDepthResponse,
} from './openFacetAPI';

// Default clarity to use until clarity prediction model is ready
const DEFAULT_CLARITY = 'VS2';

export interface DiamondPriceQuote {
  perCaratPrice: number; // USD per carat
  totalPrice: number; // Total USD
  priceRange: {
    min: number;
    max: number;
  };
  dcxIndex: number; // Market composite index
  trend24h: number; // 24h market trend in %
  confidence: number; // 0-100 confidence score
  marketDepth?: number; // Number of similar listings
  timestamp: number;
  // Internal calculation details (for debugging)
  _details?: {
    caratBand1: number;
    caratBand2: number;
    interpolationFactor: number;
    clarityUsed: string;
    colorUsed: string;
    shapeUsed: string;
  };
}

/**
 * Map AI-detected shape to pricing category
 * Round diamonds use round matrix, all others use fancy/cushion matrix
 */
function mapShapeToPricingCategory(shape: string): 'round' | 'fancy' {
  const shapeLower = shape.toLowerCase();
  if (shapeLower === 'round' || shapeLower === 'brilliant') {
    return 'round';
  }
  // Princess, Emerald, Oval, Cushion, Marquise, Pear, Heart, Radiant → fancy
  return 'fancy';
}

/**
 * Normalize color grade to match OpenFacet format
 * Handles both full names (e.g., "Colorless"), ranges (e.g., "D-F"), and GIA grades (e.g., "D")
 * OpenFacet only supports D-M grades, so we cap at M for lower grades
 */
function normalizeColorGrade(colorGrade: string, availableGrades?: string[]): string {
  const colorMap: Record<string, string> = {
    // Category names
    'Colorless': 'E', // D-F range, use E as middle
    'Near Colorless': 'H', // G-J range, use H as middle
    'Faint': 'L', // K-M range, use L
    'Light': 'M', // N-Z range - cap at M (OpenFacet limit)
    // Range formats
    'D-F': 'E', // Use middle grade
    'G-J': 'H', // Use middle grade
    'K-M': 'L', // Use middle grade
    'N-R': 'M', // Cap at M (OpenFacet limit)
    'S-Z': 'M', // Cap at M (OpenFacet limit)
  };

  // If it's a category name or range, convert to GIA grade
  let normalizedGrade = colorMap[colorGrade] || colorGrade.toUpperCase();

  // If we have available grades from the matrix, ensure we're within range
  if (availableGrades && availableGrades.length > 0) {
    const minGrade = availableGrades[0]; // Usually 'D'
    const maxGrade = availableGrades[availableGrades.length - 1]; // Usually 'M'

    // If grade is below minimum (earlier in alphabet), use minimum
    if (normalizedGrade < minGrade) {
      console.warn(`⚠️ Color grade ${normalizedGrade} below minimum ${minGrade}, using ${minGrade}`);
      normalizedGrade = minGrade;
    }

    // If grade is above maximum (later in alphabet), use maximum
    if (normalizedGrade > maxGrade) {
      console.warn(`⚠️ Color grade ${normalizedGrade} above maximum ${maxGrade}, using ${maxGrade}`);
      normalizedGrade = maxGrade;
    }
  }

  return normalizedGrade;
}

/**
 * Find the two carat bands that bracket the target carat weight
 * Returns [lowerBand, upperBand] or [exactBand, exactBand] if exact match
 */
function findCaratBands(
  caratWeight: number,
  availableBands: number[]
): [number, number] {
  const bands = availableBands.sort((a, b) => a - b);

  // Check for exact match
  if (bands.includes(caratWeight)) {
    return [caratWeight, caratWeight];
  }

  // Find bracketing bands
  for (let i = 0; i < bands.length - 1; i++) {
    if (bands[i] < caratWeight && caratWeight < bands[i + 1]) {
      return [bands[i], bands[i + 1]];
    }
  }

  // If carat is below minimum, use two lowest bands
  if (caratWeight < bands[0]) {
    console.warn(`⚠️ Carat ${caratWeight} below minimum ${bands[0]}, extrapolating`);
    return [bands[0], bands[1]];
  }

  // If carat is above maximum, use two highest bands
  if (caratWeight > bands[bands.length - 1]) {
    console.warn(`⚠️ Carat ${caratWeight} above maximum ${bands[bands.length - 1]}, extrapolating`);
    return [bands[bands.length - 2], bands[bands.length - 1]];
  }

  throw new Error(`Unable to find carat bands for ${caratWeight}`);
}

/**
 * Get log price from matrix at specified carat band, color, and clarity
 */
function getLogPrice(
  matrix: PriceMatrixResponse,
  caratBand: number,
  colorGrade: string,
  clarityGrade: string
): number {
  // Convert carat band to string with proper decimal format
  // OpenFacet uses "1.0" not "1", "0.5" not "0.5", etc.
  const caratKey = Number(caratBand).toFixed(1);

  // Get the flat array for this carat band
  const flatArray = matrix.l[caratKey];
  if (!flatArray) {
    // Debug: show available keys
    const availableKeys = Object.keys(matrix.l).join(', ');
    throw new Error(`No data for carat band ${caratBand} (key: ${caratKey}). Available: ${availableKeys}`);
  }

  // Find indices
  const colorIndex = matrix.r.indexOf(colorGrade);
  const clarityIndex = matrix.c.indexOf(clarityGrade);

  if (colorIndex === -1) {
    throw new Error(`Color grade ${colorGrade} not found in matrix. Available: ${matrix.r.join(', ')}`);
  }

  if (clarityIndex === -1) {
    throw new Error(`Clarity grade ${clarityGrade} not found in matrix. Available: ${matrix.c.join(', ')}`);
  }

  // Calculate flat array index: row * cols + col
  const [numRows, numCols] = matrix.s;
  const flatIndex = colorIndex * numCols + clarityIndex;

  if (flatIndex >= flatArray.length) {
    throw new Error(`Index ${flatIndex} out of bounds for array length ${flatArray.length}`);
  }

  return flatArray[flatIndex];
}

/**
 * Interpolate price between two carat bands using logarithmic interpolation
 * Formula: log_i = (1-λ)·log(p1) + λ·log(p2)
 * Where λ = (c - c1) / (c2 - c1)
 */
function interpolateLogPrice(
  logPrice1: number,
  logPrice2: number,
  caratWeight: number,
  caratBand1: number,
  caratBand2: number
): { interpolatedLogPrice: number; lambda: number } {
  // If bands are the same (exact match), no interpolation needed
  if (caratBand1 === caratBand2) {
    return { interpolatedLogPrice: logPrice1, lambda: 0 };
  }

  // Calculate interpolation factor λ
  const lambda = (caratWeight - caratBand1) / (caratBand2 - caratBand1);

  // Interpolate in log space
  const interpolatedLogPrice = (1 - lambda) * logPrice1 + lambda * logPrice2;

  return { interpolatedLogPrice, lambda };
}

/**
 * Calculate price range based on confidence and market volatility
 */
function calculatePriceRange(
  totalPrice: number,
  confidence: number
): { min: number; max: number } {
  // Lower confidence = wider range
  // 100% confidence → ±5% range
  // 50% confidence → ±15% range
  const baseSpread = 0.05; // 5%
  const confidenceFactor = (100 - confidence) / 100;
  const spread = baseSpread + confidenceFactor * 0.10; // Up to 15% spread

  const min = Math.round(totalPrice * (1 - spread));
  const max = Math.round(totalPrice * (1 + spread));

  return { min, max };
}

/**
 * Calculate confidence score based on various factors
 */
function calculateConfidence(
  hasExactCaratBand: boolean,
  marketDepth: number,
  dataAgeHours: number
): number {
  let confidence = 100;

  // Interpolated carat weight reduces confidence slightly
  if (!hasExactCaratBand) {
    confidence -= 10;
  }

  // Low market depth (fewer similar diamonds) reduces confidence
  if (marketDepth < 50) {
    confidence -= 15;
  } else if (marketDepth < 200) {
    confidence -= 5;
  }

  // Stale data reduces confidence
  if (dataAgeHours > 12) {
    confidence -= 10;
  } else if (dataAgeHours > 6) {
    confidence -= 5;
  }

  return Math.max(confidence, 50); // Minimum 50% confidence
}

/**
 * Get market depth for similar diamonds
 */
function getMarketDepth(
  depthData: MarketDepthResponse,
  caratWeight: number,
  colorGrade: string,
  clarityGrade: string
): number {
  try {
    // Round carat to nearest standard size for lookup
    const caratKey = caratWeight.toString();

    // Try to get color×clarity depth
    const colorClarityDepth = depthData.colclar?.[colorGrade]?.[clarityGrade];
    if (colorClarityDepth) {
      return colorClarityDepth;
    }

    // Fallback to clarity at carat
    const clarityDepth = depthData.clarity?.[caratKey]?.[clarityGrade];
    if (clarityDepth) {
      return clarityDepth;
    }

    // Fallback to color at carat
    const colorDepth = depthData.color?.[caratKey]?.[colorGrade];
    if (colorDepth) {
      return colorDepth;
    }

    return 0; // No depth data available
  } catch (error) {
    console.warn('⚠️ Error getting market depth:', error);
    return 0;
  }
}

/**
 * Main function to calculate diamond price quote
 */
export async function calculateDiamondPrice(
  caratWeight: number,
  colorGrade: string,
  shape: string,
  clarityGrade?: string // Optional, will use DEFAULT_CLARITY if not provided
): Promise<DiamondPriceQuote> {
  try {
    console.log('💰 Calculating diamond price:', {
      carat: caratWeight,
      color: colorGrade,
      clarity: clarityGrade || DEFAULT_CLARITY,
      shape,
    });

    // Fetch all required data (uses cache if available)
    const [matrixData, indexData, depthData] = await Promise.all([
      fetchPriceMatrix(),
      fetchDCXIndex(),
      fetchMarketDepth(),
    ]);

    // Normalize inputs
    const normalizedColor = normalizeColorGrade(colorGrade, matrixData.r);
    const usedClarity = clarityGrade || DEFAULT_CLARITY;
    const shapeCategory = mapShapeToPricingCategory(shape);

    console.log('📊 Using normalized values:', {
      color: normalizedColor,
      originalColor: colorGrade,
      clarity: usedClarity,
      shapeCategory,
    });

    // Note: Currently OpenFacet only provides round diamond data
    // For fancy shapes, we'll use round data as approximation until they add fancy data
    // TODO: Update when OpenFacet adds fancy shape matrices
    if (shapeCategory === 'fancy') {
      console.warn('⚠️ Using round diamond pricing for fancy shape (OpenFacet limitation)');
    }

    // Get available carat bands and parse them as numbers
    const availableBands = Object.keys(matrixData.l).map(k => parseFloat(k)).sort((a, b) => a - b);
    console.log('📏 Available carat bands:', availableBands);
    console.log('📏 Matrix keys:', Object.keys(matrixData.l));

    // Find bracketing carat bands
    const [caratBand1, caratBand2] = findCaratBands(caratWeight, availableBands);
    const hasExactMatch = caratBand1 === caratBand2;

    console.log(`🎯 Using carat bands: ${caratBand1} - ${caratBand2}${hasExactMatch ? ' (exact)' : ''}`);

    // Get log prices at both bands
    const logPrice1 = getLogPrice(matrixData, caratBand1, normalizedColor, usedClarity);
    const logPrice2 = getLogPrice(matrixData, caratBand2, normalizedColor, usedClarity);

    console.log('📈 Log prices:', { logPrice1, logPrice2 });

    // Interpolate if needed
    const { interpolatedLogPrice, lambda } = interpolateLogPrice(
      logPrice1,
      logPrice2,
      caratWeight,
      caratBand1,
      caratBand2
    );

    console.log('🔢 Interpolation:', {
      lambda,
      interpolatedLogPrice,
    });

    // Convert from log space to actual per-carat price
    const perCaratPrice = Math.exp(interpolatedLogPrice);
    const totalPrice = perCaratPrice * caratWeight;

    console.log('💎 Calculated prices:', {
      perCarat: Math.round(perCaratPrice),
      total: Math.round(totalPrice),
    });

    // Get market depth
    const marketDepth = getMarketDepth(depthData, caratWeight, normalizedColor, usedClarity);

    // Calculate data age in hours
    const dataTimestamp = new Date(matrixData.ts).getTime();
    const dataAgeHours = Math.floor((Date.now() - dataTimestamp) / (1000 * 60 * 60));

    // Calculate confidence
    const confidence = calculateConfidence(hasExactMatch, marketDepth, dataAgeHours);

    // Calculate price range
    const priceRange = calculatePriceRange(totalPrice, confidence);

    const quote: DiamondPriceQuote = {
      perCaratPrice: Math.round(perCaratPrice),
      totalPrice: Math.round(totalPrice),
      priceRange,
      dcxIndex: indexData.dcx,
      trend24h: indexData.trend,
      confidence,
      marketDepth: marketDepth > 0 ? marketDepth : undefined,
      timestamp: Date.now(),
      _details: {
        caratBand1,
        caratBand2,
        interpolationFactor: lambda,
        clarityUsed: usedClarity,
        colorUsed: normalizedColor,
        shapeUsed: shapeCategory,
      },
    };

    console.log('✅ Price quote generated:', {
      total: quote.totalPrice,
      perCarat: quote.perCaratPrice,
      confidence: quote.confidence,
      range: quote.priceRange,
    });

    return quote;
  } catch (error: any) {
    console.error('❌ Error calculating diamond price:', error.message);
    throw new Error(`Failed to calculate price: ${error.message}`);
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number, includeDecimals = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(price);
}

/**
 * Format trend percentage for display
 */
export function formatTrend(trendPercent: number): string {
  const sign = trendPercent >= 0 ? '+' : '';
  return `${sign}${trendPercent.toFixed(2)}%`;
}

/**
 * Get confidence level category
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 80) return 'high';
  if (confidence >= 65) return 'medium';
  return 'low';
}

/**
 * Get color for confidence display
 */
export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return '#10b981'; // Green
    case 'medium':
      return '#f59e0b'; // Orange
    case 'low':
      return '#ef4444'; // Red
  }
}
