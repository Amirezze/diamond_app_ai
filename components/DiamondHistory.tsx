import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { HistoryItem } from '../services/storageService';

const { width: screenWidth } = Dimensions.get('window');

interface DiamondHistoryProps {
  historyItems: HistoryItem[];
  onItemPress?: (item: HistoryItem) => void;
  onLongPress?: (item: HistoryItem, onCancel?: () => void) => void;
  onClearAll?: () => void;
  isAuthenticated?: boolean;
}

export const DiamondHistory: React.FC<DiamondHistoryProps> = ({
  historyItems,
  onItemPress,
  onLongPress,
  onClearAll,
  isAuthenticated = false,
}) => {

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getGradeColor = (cutGrade: string) => {
    const grade = cutGrade.toUpperCase();
    if (grade.includes('EX')) return theme.primary;
    if (grade.includes('VG')) return theme.gradients.primary[1];
    return theme.accent;
  };

  const getGradeLabel = (cutGrade: string) => {
    const grade = cutGrade.toUpperCase();
    if (grade.includes('EX')) return 'Excellent';
    if (grade.includes('VG')) return 'Very Good';
    if (grade.includes('GD') || grade.includes('GOOD')) return 'Good';
    if (grade.includes('F') || grade.includes('FAIR')) return 'Fair';
    return cutGrade;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <LinearGradient
        colors={['#1e2024', '#2a2c31']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.stickyHeader}
      >
        <View style={styles.headerContainer}>
          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>History</Text>
            {historyItems.length > 0 && (
              <Text style={styles.pageSubtitle}>Long press to delete</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <LinearGradient
              colors={['#e4c078', '#fce588']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.countBadge}
            >
              <Text style={styles.countNumber}>{historyItems.length}</Text>
              <Text style={styles.countLabel}>Items</Text>
            </LinearGradient>
            {historyItems.length > 0 && onClearAll && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={onClearAll}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#e4c078" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Section */}
        <View style={styles.mainSection}>

          {/* History Cards */}
          <View style={styles.cardsContainer}>
            {historyItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => onItemPress?.(item)}
                onLongPress={() => onLongPress?.(item)}
                activeOpacity={0.85}
                style={styles.historyCard}
              >
                <View style={styles.cardContainer}>
                  {/* Left side - Image */}
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: item.imageUri }} style={styles.diamondImage} />
                  </View>

                  {/* Right side - Info */}
                  <View style={styles.infoContainer}>
                    {/* Date and Time */}
                    <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
                    <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>

                    {/* Shape */}
                    <View style={styles.shapeContainer}>
                      <Ionicons name="diamond" size={16} color="#e4c078" />
                      <Text style={styles.shapeText}>{item.shape}</Text>
                    </View>

                    {/* Price */}
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceValue}>
                        {formatPrice(item.pricingData?.totalPrice || item.estimatedPrice)}
                      </Text>
                    </View>

                    {/* Tap indicator */}
                    <View style={styles.tapIndicator}>
                      <Text style={styles.tapText}>Tap for details</Text>
                      <Ionicons name="chevron-forward-circle" size={16} color="#e4c078" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Empty State (if no items) */}
          {historyItems.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="diamond-outline" size={64} color={theme.gradients.primary[1]} />
              {isAuthenticated ? (
                <>
                  <Text style={styles.emptyTitle}>No Scans Yet</Text>
                  <Text style={styles.emptySubtitle}>Your diamond scans will appear here</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>Sign In to Save Scans</Text>
                  <Text style={styles.emptySubtitle}>Create an account to save and access your diamond scans from any device</Text>
                  <TouchableOpacity
                    style={styles.signInButton}
                    onPress={() => {
                      const { router } = require('expo-router');
                      router.push('/(auth)/sign-in');
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#e4c078', '#fce588']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.signInButtonGradient}
                    >
                      <Text style={styles.signInButtonText}>Sign In</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  titleSection: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  countBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e2024',
  },
  countLabel: {
    fontSize: 9,
    color: '#1e2024',
    fontWeight: '500',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 192, 120, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(228, 192, 120, 0.3)',
  },
  mainSection: {
    paddingHorizontal: 20,
    paddingTop: 140,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardsContainer: {
    gap: 16,
  },
  historyCard: {
    marginBottom: 16,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: 140,
    height: 160,
  },
  diamondImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoContainer: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e2024',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 10,
  },
  shapeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  shapeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  priceContainer: {
    marginBottom: 10,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
    letterSpacing: -0.5,
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  tapText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e2024',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  signInButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  signInButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e2024',
  },
  bottomSpace: {
    height: 40,
  },
});