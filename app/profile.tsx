import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { theme } from '@/constants/theme';
import { useAppDispatch, useIsAuthenticated, useUser, useUserProfile } from '@/store/hooks';
import { signOut, updateProfile } from '@/store/authSlice';
import { router } from 'expo-router';
import { EditProfile } from '@/components/EditProfile';
import { ChangePassword } from '@/components/ChangePassword';

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useIsAuthenticated();
  const user = useUser();
  const profile = useUserProfile();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [showEditProfile, setShowEditProfile] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);

  // If not authenticated, show sign-in prompt
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1e2024', '#2a2c31']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#e4c078" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </LinearGradient>

        <View style={styles.unauthenticatedContainer}>
          <Ionicons name="person-circle-outline" size={80} color={theme.gradients.primary[1]} />
          <Text style={styles.unauthenticatedTitle}>Sign In to View Profile</Text>
          <Text style={styles.unauthenticatedSubtitle}>
            Create an account to save your scans and access your profile
          </Text>

          <TouchableOpacity
            style={styles.signInButtonContainer}
            onPress={() => router.push('/(auth)/sign-in')}
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

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push('/(auth)/sign-up')}
            activeOpacity={0.8}
          >
            <Text style={styles.createAccountButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleSaveProfile = async (name: string, photoURL?: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Update profile in Firestore via Redux
      await dispatch(updateProfile({
        userId: user.uid,
        data: { name, photoURL }
      })).unwrap();

      // Update Firebase Auth display name and photo
      const { updateProfile: updateFirebaseProfile } = await import('firebase/auth');
      const { auth } = await import('../config/firebase');
      if (auth.currentUser) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: name,
          photoURL: photoURL || null
        });
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSigningOut(true);
              await dispatch(signOut()).unwrap();
              // Navigation will be handled by auth listener in _layout.tsx
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const formatMemberSince = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#1e2024', '#2a2c31']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#e4c078" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profile?.photoURL || user?.photoURL ? (
                  <Image
                    source={{ uri: profile?.photoURL || user?.photoURL || undefined }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <LinearGradient
                    colors={['#e4c078', '#fce588']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {profile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                )}
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                {profile?.createdAt && (
                  <View style={styles.memberBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                    <Text style={styles.memberSince}>
                      Member since {formatMemberSince(profile.createdAt)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#fef3e8', '#ffffff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.statGradient}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="diamond" size={24} color="#e4c078" />
                  </View>
                  <Text style={styles.statValue}>{profile?.scanCount || 0}</Text>
                  <Text style={styles.statLabel}>Total Scans</Text>
                </LinearGradient>
              </View>

              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#fef3e8', '#ffffff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.statGradient}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="calendar-outline" size={24} color="#e4c078" />
                  </View>
                  <Text style={styles.statValue}>
                    {profile?.createdAt ? Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24)) : 0}
                  </Text>
                  <Text style={styles.statLabel}>Days Active</Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Account Settings */}
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Account Settings</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowEditProfile(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconContainer, styles.editProfileIconContainer]}>
                  <Ionicons name="person-outline" size={20} color="#e4c078" />
                </View>
                <Text style={styles.settingText}>Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#e4c078" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowChangePassword(true)}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconContainer, styles.changePasswordIconContainer]}>
                  <Ionicons name="key-outline" size={20} color="#e4c078" />
                </View>
                <Text style={styles.settingText}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#e4c078" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleSignOut}
              disabled={isSigningOut}
              activeOpacity={0.7}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconContainer, styles.signOutIconContainer]}>
                  {isSigningOut ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  )}
                </View>
                <Text style={[styles.settingText, styles.signOutText]}>
                  {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                </Text>
              </View>
              {!isSigningOut && <Ionicons name="chevron-forward" size={20} color="#ef4444" />}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfile
        visible={showEditProfile}
        currentName={profile?.name || user?.displayName || ''}
        currentPhotoURL={profile?.photoURL || user?.photoURL || undefined}
        onClose={() => setShowEditProfile(false)}
        onSave={handleSaveProfile}
      />

      {/* Change Password Modal */}
      <ChangePassword
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Unauthenticated State
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  unauthenticatedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e2024',
    marginTop: 24,
    marginBottom: 12,
  },
  unauthenticatedSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  signInButtonContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  signInButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e2024',
  },
  createAccountButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e4c078',
  },
  createAccountButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e4c078',
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#e4c078',
    shadowColor: '#e4c078',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e2024',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  memberSince: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Settings Card
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileIconContainer: {
    backgroundColor: '#fef3e8',
  },
  changePasswordIconContainer: {
    backgroundColor: '#fef3e8',
  },
  signOutIconContainer: {
    backgroundColor: '#fef2f2',
  },
  settingText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  signOutText: {
    color: '#ef4444',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },

  bottomSpace: {
    height: 40,
  },
});
