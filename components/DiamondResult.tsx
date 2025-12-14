import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatPrice, formatTrend } from '../services/pricingService';
import { fetchDiamondPrice } from '../store/diamondSlice';
import { useAppDispatch, useAppSelector, useIsAuthenticated } from '../store/hooks';
import { AuthPrompt } from './AuthPrompt';

// Map color grade classes to GIA ranges
const getColorGradeRange = (colorGrade: string): string => {
  const gradeMap: Record<string, string> = {
    'Colorless': 'D-F',
    'Near Colorless': 'G-J',
    'Faint': 'K-M',
    'Light': 'N-Z',
  };

  return gradeMap[colorGrade] || '';
};

// Get description for color grade
const getColorGradeDescription = (colorGrade: string): string => {
  const descriptionMap: Record<string, string> = {
    'Colorless': 'No visible color - Premium',
    'Near Colorless': 'Slight color - Excellent value',
    'Faint': 'Noticeable tint - Good value',
    'Light': 'Visible color - Budget friendly',
  };

  return descriptionMap[colorGrade] || '';
};

// Map clarity grade classes to GIA ranges
const getClarityGradeRange = (clarityGrade: string): string => {
  const gradeMap: Record<string, string> = {
    'High Clarity': 'FL-VVS2',
    'Medium Clarity': 'VS1-SI1',
    'Low Clarity': 'SI2-I3',
  };

  return gradeMap[clarityGrade] || '';
};

const { width: screenWidth } = Dimensions.get('window');

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

interface ShapeDetection {
  shape: string;
  confidence: number;
  timestamp: number;
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

interface DiamondResultProps {
  scannedImage: {
    uri: string;
    base64?: string;
  };
  cutPrediction?: CutPrediction;
  colorPrediction?: ColorPrediction;
  clarityPrediction?: ClarityPrediction;
  shapeDetection?: ShapeDetection;
  caratWeight?: number;
  savedPricingData?: {
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
  onBack?: () => void;
  onScanAgain?: () => void;
  onSave?: () => void;
}

interface DiamondAnalysis {
  cut: {
    grade: string;
    score: number;
    description: string;
  };
  color: {
    grade: string;
    score: number;
    description: string;
  };
  clarity: {
    grade: string;
    score: number;
    description: string;
  };
  carat: {
    weight: number;
    description: string;
  };
  price: {
    estimated: number;
    range: {
      min: number;
      max: number;
    };
    confidence: number;
  };
  overallGrade: string;
}

// Dummy data for demonstration
const generateDummyAnalysis = (caratWeight: number): DiamondAnalysis => {
  const cuts = ['Excellent', 'Very Good', 'Good', 'Fair'];
  const colors = ['D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const clarities = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2'];

  const cut = cuts[Math.floor(Math.random() * cuts.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const clarity = clarities[Math.floor(Math.random() * clarities.length)];
  const basePrice = caratWeight * (2000 + Math.random() * 8000);

  return {
    cut: {
      grade: cut,
      score: 85 + Math.random() * 15,
      description: cut === 'Excellent' ? 'Maximum brilliance and fire' : 'Good light performance'
    },
    color: {
      grade: color,
      score: 80 + Math.random() * 20,
      description: color <= 'F' ? 'Colorless grade' : 'Near colorless grade'
    },
    clarity: {
      grade: clarity,
      score: 75 + Math.random() * 25,
      description: clarity.includes('FL') || clarity.includes('IF') ? 'Flawless clarity' : 'Minor inclusions'
    },
    carat: {
      weight: caratWeight,
      description: `${caratWeight.toFixed(2)} carat weight`
    },
    price: {
      estimated: Math.round(basePrice),
      range: {
        min: Math.round(basePrice * 0.85),
        max: Math.round(basePrice * 1.15)
      },
      confidence: 75 + Math.random() * 20
    },
    overallGrade: cut === 'Excellent' && color <= 'F' ? 'Premium' : 'Good'
  };
};

export const DiamondResult: React.FC<DiamondResultProps> = ({
  scannedImage,
  cutPrediction,
  colorPrediction,
  clarityPrediction,
  shapeDetection,
  caratWeight = 1.0,
  savedPricingData,
  onBack,
  onScanAgain,
  onSave,
}) => {
  const dispatch = useAppDispatch();
  const { pricingData, isPricingLoading, pricingError } = useAppSelector((state) => state.diamond);
  const isAuthenticated = useIsAuthenticated();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Use saved pricing data if available (from history), otherwise use Redux state
  const displayPricingData = savedPricingData || pricingData;

  // Debug logging
  console.log('🔍 DiamondResult - clarityPrediction:', clarityPrediction);
  console.log('🔍 DiamondResult - colorPrediction:', colorPrediction);

  // Fetch real-time pricing when component mounts or when diamond specs change
  // Skip fetching if we have saved pricing data (viewing from history)
  useEffect(() => {
    if (!savedPricingData && caratWeight && colorPrediction && shapeDetection && !isPricingLoading) {
      console.log('🔄 Fetching diamond price for:', {
        carat: caratWeight,
        color: colorPrediction.colorGrade,
        shape: shapeDetection.shape,
        clarity: clarityPrediction?.clarityGrade || 'Not detected',
      });
      dispatch(fetchDiamondPrice());
    } else if (savedPricingData) {
      console.log('✅ Using saved pricing data from history');
    }
  }, [savedPricingData, caratWeight, colorPrediction?.id, shapeDetection?.timestamp, clarityPrediction?.id, dispatch]);

  // Handle save button - check auth first
  const handleSave = () => {
    if (!isAuthenticated) {
      console.log('⚠️ User not authenticated - showing auth prompt');
      setShowAuthPrompt(true);
    } else if (onSave) {
      console.log('✅ User authenticated - saving scan');
      onSave();
    }
  };

  // Generate analysis data (used for price estimates and fallback data)
  const analysis = generateDummyAnalysis(caratWeight);

  const formatCutGrade = (grade: string) => {
    return grade
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getGradeLabel = (grade: string, type: 'cut' | 'color' | 'clarity') => {
    if (type === 'cut') {
      if (grade === 'Excellent') return 'EXCEPTIONAL';
      if (grade === 'Very Good') return 'SUPERIOR';
      if (grade === 'Good') return 'QUALITY';
      return 'STANDARD';
    }
    return grade;
  };

  return (
    <View style={styles.container}>
      {/* Header with Dark Theme */}
      <LinearGradient
        colors={['#1e2024', '#2a2c31']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#e4c078" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Result</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroSection}>
          <Image
            source={{ uri: scannedImage.uri }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.imageOverlay}
          />
          
          {/* Shape Badge */}
          {shapeDetection && (
            <View style={styles.shapeBadge}>
              <Ionicons name="diamond" size={18} color="#e4c078" />
              <Text style={styles.shapeBadgeText}>{shapeDetection.shape}</Text>
              <Text style={styles.shapeConfidence}>
                {Math.round(shapeDetection.confidence)}%
              </Text>
            </View>
          )}
        </View>

        {/* Price Card with Gold Accent */}
        <View style={styles.priceSection}>
          <LinearGradient
            colors={['#e4c078', '#fce588', '#e4c078']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.priceGradientBorder}
          >
            <View style={styles.priceCard}>
              <View style={styles.priceHeader}>
                <Ionicons name="pricetag" size={20} color="#e4c078" />
                <Text style={styles.priceLabel}>
                  {displayPricingData ? (savedPricingData ? 'Saved Price' : 'Market Price') : 'Estimated Value'}
                </Text>
                {isPricingLoading && !savedPricingData && (
                  <ActivityIndicator size="small" color="#e4c078" style={{ marginLeft: 8 }} />
                )}
              </View>

              {isPricingLoading && !savedPricingData ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#e4c078" />
                  <Text style={styles.loadingText}>Fetching real-time price...</Text>
                </View>
              ) : pricingError && !savedPricingData ? (
                <View style={{ paddingVertical: 10 }}>
                  <Text style={styles.priceAmount}>
                    ${analysis.price.estimated.toLocaleString()}
                  </Text>
                  <Text style={styles.errorText}>
                    Unable to fetch live pricing
                  </Text>
                </View>
              ) : displayPricingData ? (
                <>
                  <Text style={styles.priceAmount}>
                    ${displayPricingData.totalPrice.toLocaleString()}
                  </Text>

                  <View style={styles.priceRange}>
                    <Text style={styles.priceRangeText}>
                      {formatPrice(displayPricingData.priceRange.min)} - {formatPrice(displayPricingData.priceRange.max)}
                    </Text>
                  </View>

                  {displayPricingData.trend24h !== 0 && (
                    <View style={styles.trendContainer}>
                      <Ionicons
                        name={displayPricingData.trend24h >= 0 ? 'trending-up' : 'trending-down'}
                        size={16}
                        color={displayPricingData.trend24h >= 0 ? '#10b981' : '#ef4444'}
                      />
                      <Text style={[
                        styles.trendText,
                        { color: displayPricingData.trend24h >= 0 ? '#10b981' : '#ef4444' }
                      ]}>
                        {formatTrend(displayPricingData.trend24h)} (24h)
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.priceAmount}>
                    ${analysis.price.estimated.toLocaleString()}
                  </Text>
                  <View style={styles.priceRange}>
                    <Text style={styles.priceRangeText}>
                      {formatPrice(analysis.price.range.min)} - {formatPrice(analysis.price.range.max)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* 4C's Analysis */}
        <View style={styles.analysisSection}>
          <Text style={styles.sectionTitle}>Quality Assessment</Text>

          {/* Cut Card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View style={styles.mainCardIcon}>
                <Ionicons name="cut" size={22} color="#e4c078" />
              </View>
              <View style={styles.mainCardInfo}>
                <Text style={styles.mainCardLabel}>Cut</Text>
                <Text style={styles.mainCardValue}>
                  {cutPrediction ? formatCutGrade(cutPrediction.cutGrade) : analysis.cut.grade}
                </Text>
              </View>
              {cutPrediction && (
                <View style={styles.mainCardConfidence}>
                  <Text style={styles.confidenceText}>
                    {Math.round(cutPrediction.confidence)}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Color Card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View style={styles.mainCardIcon}>
                <Ionicons name="color-palette" size={22} color="#e4c078" />
              </View>
              <View style={styles.mainCardInfo}>
                <Text style={styles.mainCardLabel}>Color</Text>
                <Text style={styles.mainCardValue}>
                  {colorPrediction ? (() => {
                    const range = getColorGradeRange(colorPrediction.colorGrade);
                    return range ? `${colorPrediction.colorGrade} (${range})` : colorPrediction.colorGrade;
                  })() : analysis.color.grade}
                </Text>
              </View>
              {colorPrediction && (
                <View style={styles.mainCardConfidence}>
                  <Text style={styles.confidenceText}>
                    {Math.round(colorPrediction.confidence)}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Clarity Card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View style={styles.mainCardIcon}>
                <Ionicons name="eye" size={22} color="#e4c078" />
              </View>
              <View style={styles.mainCardInfo}>
                <Text style={styles.mainCardLabel}>Clarity</Text>
                <Text style={styles.mainCardValue}>
                  {clarityPrediction ? getClarityGradeRange(clarityPrediction.clarityGrade) || clarityPrediction.clarityGrade : analysis.clarity.grade}
                </Text>
              </View>
              {clarityPrediction && (
                <View style={styles.mainCardConfidence}>
                  <Text style={styles.confidenceText}>
                    {Math.round(clarityPrediction.confidence)}%
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Carat Card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View style={styles.mainCardIcon}>
                <Ionicons name="diamond-outline" size={22} color="#e4c078" />
              </View>
              <View style={styles.mainCardInfo}>
                <Text style={styles.mainCardLabel}>Carat</Text>
                <Text style={styles.mainCardValue}>{caratWeight.toFixed(2)} ct</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onScanAgain}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#e4c078', '#fce588']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Ionicons name="camera" size={22} color="#1e2024" />
              <Text style={styles.primaryButtonText}>Scan Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Auth Prompt Modal */}
      <AuthPrompt
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 192, 120, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(228, 192, 120, 0.3)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    position: 'relative',
    height: 320,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  shapeBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  shapeBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  shapeConfidence: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e4c078',
    marginLeft: 4,
  },

  // Price Section
  priceSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  priceGradientBorder: {
    padding: 2,
    borderRadius: 20,
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  priceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: '#1e2024',
    letterSpacing: -1,
    marginBottom: 12,
  },
  priceRange: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  priceRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  priceDetails: {
    marginTop: 8,
    marginBottom: 4,
  },
  pricePerCarat: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  trendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  marketDepthText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  priceNoteText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Analysis Section
  analysisSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e2024',
    marginBottom: 16,
  },

  // Main Card (Cut)
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fef8ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCardInfo: {
    flex: 1,
  },
  mainCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mainCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e2024',
  },
  mainCardSubValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 4,
  },
  mainCardConfidence: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  mainCardDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
    lineHeight: 18,
  },

  // Actions
  actionsSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e2024',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#1e2024',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a3d45',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e4c078',
  },

  bottomSpace: {
    height: 40,
  },
});