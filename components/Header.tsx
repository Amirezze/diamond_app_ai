import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';
import { useIsAuthenticated } from '../store/hooks';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = "DiamondAI",
  subtitle = "Scanner"
}) => {
  const isAuthenticated = useIsAuthenticated();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.maxWidth}>
        <View style={styles.flexContainer}>
          <View style={styles.leftSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoGradient}>
                <Ionicons name="diamond" size={24} color="white" />
              </View>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.titleText}>{title}</Text>
              <View style={styles.subtitleContainer}>
                <View style={styles.divider} />
                <Text style={styles.subtitleText}>{subtitle}</Text>
                <View style={styles.divider} />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.profileIconContainer,
              isAuthenticated && styles.profileIconContainerAuthenticated
            ]}>
              <Ionicons
                name={isAuthenticated ? "person" : "person-outline"}
                size={22}
                color="white"
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 0,
  },
  maxWidth: {
    width: '100%',
    zIndex: 1,
  },
  flexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    position: 'relative',
  },
  logoGradient: {
    padding: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228, 192, 120, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(252, 229, 136, 0.5)',
  },
  textContainer: {
    gap: 3,
    alignItems: 'flex-start',
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    textAlign: 'left',
    letterSpacing: 0.3,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-start',
  },
  divider: {
    width: 20,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileButton: {
    marginLeft: 'auto',
  },
  profileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  profileIconContainerAuthenticated: {
    backgroundColor: 'rgba(228, 192, 120, 0.3)',
    borderColor: 'rgba(252, 229, 136, 0.5)',
    borderWidth: 2,
  },

});