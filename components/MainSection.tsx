import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';
import { loadHistoryFromStorage } from '../store/diamondSlice';
import { useAppDispatch, useHistory } from '../store/hooks';
import { Header } from './Header';

interface AnalysisFeature {
  id: number;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  detailTitle: string;
  detailDescription: string;
  detailPoints: string[];
}

const analysisFeatures: AnalysisFeature[] = [
  {
    id: 1,
    title: "Cut",
    description: "How well light reflects through the diamond",
    iconName: "diamond",
    iconColor: "#e4c078",
    iconBgColor: "#fef8ec",
    detailTitle: "Cut Quality",
    detailDescription: "The cut determines how well a diamond reflects light, directly affecting its brilliance and sparkle. It's considered the most important factor in a diamond's beauty.",
    detailPoints: [
      "Evaluates proportions and symmetry",
      "Measures light performance",
      "Grades from Excellent to Poor",
      "Most impact on diamond's appearance"
    ]
  },
  {
    id: 2,
    title: "Color",
    description: "Absence of color from D to Z scale",
    iconName: "color-palette",
    iconColor: "#e4c078",
    iconBgColor: "#fef8ec",
    detailTitle: "Color Grade",
    detailDescription: "Color grading measures the absence of color in a diamond. The less color, the higher the grade and value, with D being completely colorless.",
    detailPoints: [
      "Graded from D (colorless) to Z (light yellow)",
      "D-F: Colorless (highest grade)",
      "G-J: Near colorless",
      "Significantly affects diamond value"
    ]
  },
  {
    id: 3,
    title: "Clarity",
    description: "Internal & external imperfections",
    iconName: "eye",
    iconColor: "#e4c078",
    iconBgColor: "#fef8ec",
    detailTitle: "Clarity Grade",
    detailDescription: "Clarity measures the presence of internal inclusions and external blemishes. Fewer imperfections mean higher clarity and value.",
    detailPoints: [
      "FL/IF: Flawless to Internally Flawless",
      "VVS1-VVS2: Very Very Slightly Included",
      "VS1-VS2: Very Slightly Included",
      "SI1-SI2, I1-I3: Included grades"
    ]
  },
  {
    id: 4,
    title: "Carat",
    description: "Weight measured in carats (1ct = 0.2g)",
    iconName: "scale",
    iconColor: "#e4c078",
    iconBgColor: "#fef8ec",
    detailTitle: "Carat Weight",
    detailDescription: "Carat is the standard unit of weight for diamonds. One carat equals 200 milligrams. Larger diamonds are rarer and more valuable per carat.",
    detailPoints: [
      "1 carat = 200 milligrams (0.2 grams)",
      "Larger carats exponentially increase value",
      "Size perception varies by shape",
      "Most straightforward of the 4Cs to measure"
    ]
  },
];

export const MainSection: React.FC = () => {
  const dispatch = useAppDispatch();
  const history = useHistory();
  const [selectedFeature, setSelectedFeature] = useState<AnalysisFeature | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Load history on mount
  useEffect(() => {
    dispatch(loadHistoryFromStorage());
  }, [dispatch]);

  // Animate modal in/out
  useEffect(() => {
    if (modalVisible) {
      // Reset values before animating in
      fadeAnim.setValue(0);
      slideAnim.setValue(300);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [modalVisible, fadeAnim, slideAnim]);

  // Get the 3 most recent scans
  const recentScans = history.slice(0, 3);

  const handleFeaturePress = (feature: AnalysisFeature) => {
    setSelectedFeature(feature);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedFeature(null), 300);
  };

  const handleRecentScanPress = (scanId: string) => {
    router.push({
      pathname: '/history-detail',
      params: { id: scanId }
    });
  };

  const formatRelativeDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } else if (days > 1) {
      return `${days} days ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getGradeLabel = (cutGrade: string) => {
    const grade = cutGrade.toUpperCase();
    if (grade.includes('EX')) return 'Excellent';
    if (grade.includes('VG')) return 'Very Good';
    if (grade.includes('GD') || grade.includes('GOOD')) return 'Good';
    if (grade.includes('F') || grade.includes('FAIR')) return 'Fair';
    return cutGrade;
  };

  return (
    <View style={styles.container}>
      {/* Fixed Background Image */}
      <ImageBackground
        source={require('../assets/images/diamond-hero.jpg')}
        style={styles.fixedBackground}
        imageStyle={styles.fixedBackgroundImage}
      >
        <LinearGradient
          colors={['rgba(30,32,36,0.2)', 'rgba(30,32,36,0.5)', 'rgba(30,32,36,0.75)']}
          style={styles.fixedBackgroundOverlay}
        />
      </ImageBackground>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section with Header Overlay */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Discover Your Diamond's True Value</Text>
            <Text style={styles.heroSubtitle}>AI-powered diamond analysis</Text>
          </View>
          <View style={styles.headerAbsolute}>
            <Header title="DiamondAI" subtitle="Scanner" />
          </View>
        </View>

      {/* Diamond Quality Features Section */}
      <View style={styles.contentBackground}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Diamond Quality Features</Text>
          <Text style={styles.sectionSubtitle}>The 4 C's of diamond grading • Tap cards to learn more</Text>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresGrid}>
          {analysisFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.featureCard}
              activeOpacity={0.7}
              onPress={() => handleFeaturePress(feature)}
            >
              <View style={styles.featureTop}>
                <View style={[styles.iconCircle, { backgroundColor: feature.iconBgColor }]}>
                  <Ionicons name={feature.iconName} size={36} color={feature.iconColor} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Section */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Scans</Text>
          {recentScans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="diamond-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No scans yet</Text>
              <Text style={styles.emptyStateSubtext}>Start scanning to see your history</Text>
            </View>
          ) : (
            recentScans.map((scan) => (
              <TouchableOpacity
                key={scan.id}
                style={styles.recentCard}
                activeOpacity={0.7}
                onPress={() => handleRecentScanPress(scan.id)}
              >
                <Image
                  source={{ uri: scan.imageUri }}
                  style={styles.recentImage}
                />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentDate}>{formatRelativeDate(scan.timestamp)}</Text>
                  <Text style={styles.recentShape}>{scan.shape}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.text.muted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
      </ScrollView>

      {/* Feature Detail Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={closeModal}
          />
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={32} color="#6b7280" />
            </TouchableOpacity>

            {selectedFeature && (
              <>
                <Text style={styles.modalTitle}>{selectedFeature.detailTitle}</Text>
                <Text style={styles.modalDescription}>{selectedFeature.detailDescription}</Text>

                <View style={styles.modalPointsContainer}>
                  {selectedFeature.detailPoints.map((point, index) => (
                    <View key={index} style={styles.modalPoint}>
                      <View style={styles.modalPointBullet}>
                        <Ionicons name="checkmark-circle" size={20} color="#e4c078" />
                      </View>
                      <Text style={styles.modalPointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fixedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    zIndex: 0,
  },
  fixedBackgroundImage: {
    resizeMode: 'cover',
  },
  fixedBackgroundOverlay: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    width: '100%',
    height: 450,
    marginBottom: 0,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 5,
    width: '100%',
  },
  headerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  topSpacing: {
    height: 10,
  },
  contentBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    zIndex: 2,
  },
  header: {
    marginBottom: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e2024',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
    letterSpacing: 0.2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 32,
  },
  featureCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    justifyContent: 'center',
  },
  featureTop: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#e4c078',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e2024',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  recentSection: {
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  recentTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e2024',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  recentImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#f3f4f6',
  },
  recentInfo: {
    flex: 1,
  },
  recentDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e2024',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  recentShape: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e4c078',
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e2024',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  modalDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
    letterSpacing: 0.1,
  },
  modalPointsContainer: {
    gap: 14,
  },
  modalPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  modalPointBullet: {
    marginRight: 12,
    marginTop: 2,
  },
  modalPointText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 22,
    letterSpacing: 0.1,
  },
});
