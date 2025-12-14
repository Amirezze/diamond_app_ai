import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface DiamondQualityCardProps {
  title: string;
  description: string;
  details: string;
  iconName: keyof typeof Ionicons.glyphMap;
  gradientColors: readonly string[];
}

export const DiamondQualityCard: React.FC<DiamondQualityCardProps> = ({
  title,
  description,
  details,
  iconName,
  gradientColors
}) => {
  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={[gradientColors[0], gradientColors[1]]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={[gradientColors[0], gradientColors[1]]}
              style={styles.iconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={iconName} size={28} color="white" />
            </LinearGradient>
            <View style={[styles.iconGlow, { backgroundColor: gradientColors[0] + '30' }]} />
          </View>

          <View style={styles.textContent}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>

            <View style={styles.detailsContainer}>
              <LinearGradient
                colors={['transparent', gradientColors[0] + '20', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.detailsDivider}
              />
              <Text style={[styles.details, { color: 'white' }]}>{details}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 24,
    padding: 0,
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 24,
    zIndex: 1,
  },
  iconWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    position: 'relative',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  iconGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 32,
    zIndex: -1,
  },
  textContent: {
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: 'white',
    lineHeight: 22,
    marginBottom: 16,
    fontWeight: '400',
  },
  detailsContainer: {
    gap: 12,
  },
  detailsDivider: {
    height: 2,
    borderRadius: 1,
  },
  details: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});