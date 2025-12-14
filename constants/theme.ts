// Theme configuration for AI Diamond App
// Luxury color scheme with dark charcoal and rich gold

export const lightTheme = {
  background: '#ffffff',        // Pure white background
  foreground: '#1e2024',        // Luxury Dark - Deep charcoal black
  primary: '#e4c078',           // Luxury Gold - Rich gold for accents
  accent: '#333944',            // Luxury Accent - Dark slate for secondary elements
  secondary: '#f8f8f8',         // Very light gray
  muted: '#f5f5f5',             // Subtle gray tint
  border: '#e5e5e5',            // Soft gray border

  // Text colors
  text: {
    primary: '#1e2024',         // Luxury Dark
    secondary: '#333944',       // Luxury Accent
    muted: '#6b7280',
  },

  // Gold colors
  gold: {
    primary: '#e4c078',         // Luxury Gold
    light: '#fce588',           // Luxury Gold Light
  },

  // Gradients
  gradients: {
    primary: ['#e4c078', '#fce588'],         // Rich gold to light gold
    background: ['#ffffff', '#f8f8f8'],      // White to light gray
    hero: ['#333944', '#1e2024'],            // Dark slate to luxury dark
  },

  // Shadow colors
  shadows: {
    primary: 'rgba(228, 192, 120, 0.25)',   // Gold shadow
    dark: 'rgba(30, 32, 36, 0.15)',         // Dark shadow
  },
};

export const darkTheme = {
  background: '#1e2024',        // Luxury Dark - Deep charcoal black
  foreground: '#ffffff',        // Pure white
  primary: '#e4c078',           // Luxury Gold
  accent: '#333944',            // Luxury Accent
  secondary: '#2a2c31',         // Slightly lighter than background
  muted: '#333944',             // Dark slate
  border: '#3a3d45',            // Dark borders

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: '#e5e5e5',
    muted: '#9ca3af',
  },

  // Gold colors
  gold: {
    primary: '#e4c078',         // Luxury Gold
    light: '#fce588',           // Luxury Gold Light
  },

  // Gradients
  gradients: {
    primary: ['#e4c078', '#fce588'],         // Rich gold to light gold
    background: ['#1e2024', '#2a2c31'],      // Luxury dark to lighter
    hero: ['#333944', '#1e2024'],            // Dark slate to luxury dark
  },

  // Shadow colors
  shadows: {
    primary: 'rgba(228, 192, 120, 0.3)',    // Gold shadow
    dark: 'rgba(0, 0, 0, 0.4)',             // Darker shadow
  },
};

// Default to light theme
export const theme = lightTheme;

// Export types for TypeScript
export type Theme = typeof lightTheme;
export type ThemeColors = keyof typeof lightTheme;
