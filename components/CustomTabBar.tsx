import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {/* Thick upper border */}
      <View style={styles.upperBorder} />

      {/* Camera Button on upper border */}
      <TouchableOpacity
        style={styles.cameraButton}
        onPress={() => router.push('/camera')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={theme.gradients.primary}
          style={styles.cameraGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="camera" size={36} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Tab Bar Content */}
      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          // Skip camera route as it's handled by the floating button
          if (route.name === 'camera') return null;

          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? typeof options.tabBarLabel === 'function'
                ? options.tabBarLabel({ focused: isFocused, color: isFocused ? theme.primary : theme.text.muted, position: 'beside-icon', children: route.name })
                : options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const iconName =
            route.name === 'index' ? 'home' :
            route.name === 'history' ? 'time-outline' :
            route.name === 'profile' ? 'person-outline' :
            'home';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName}
                size={32}
                color={isFocused ? theme.primary : theme.text.muted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? theme.primary : theme.text.muted }
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  upperBorder: {
    height: 2,
    backgroundColor: '#e4c078',
    shadowColor: '#e4c078',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  cameraButton: {
    position: 'absolute',
    top: -35,
    left: screenWidth / 2 - 45,
    zIndex: 1000,
  },
  cameraGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'white',
    shadowColor: '#e4c078',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 24,
  },
  tabBarContent: {
    flexDirection: 'row',
    height: 120,
    paddingTop: 25,
    paddingBottom: 30,
    paddingHorizontal: -20,
    backgroundColor: '#ffffff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.3,
  },
});