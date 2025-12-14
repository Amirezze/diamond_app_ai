import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserProfile } from '../store/authSlice';
import type { HistoryItem } from './storageService';

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  userId: string,
  profileData: Omit<UserProfile, 'uid'>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);

    const profile: UserProfile = {
      uid: userId,
      ...profileData,
    };

    await setDoc(userRef, profile);
    console.log('✅ User profile created:', userId);
  } catch (error: any) {
    console.error('❌ Error creating user profile:', error.message);
    throw new Error('Failed to create user profile');
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }

    console.log('⚠️ User profile not found:', userId);
    return null;
  } catch (error: any) {
    console.error('❌ Error loading user profile:', error.message);
    throw new Error('Failed to load user profile');
  }
};

/**
 * Update user profile in Firestore
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      ...updates,
      updatedAt: Date.now(),
    });

    console.log('✅ User profile updated:', userId);
  } catch (error: any) {
    console.error('❌ Error updating user profile:', error.message);
    throw new Error('Failed to update user profile');
  }
};

/**
 * Save a scan to Firestore
 * Stores in users/{userId}/scans/{scanId}
 * NOTE: imageUri is stored as local URI (not uploaded to Storage - free tier)
 */
export const saveScan = async (userId: string, scan: HistoryItem): Promise<void> => {
  try {
    const scanRef = doc(db, 'users', userId, 'scans', scan.id);

    // Convert HistoryItem to Firestore document
    // Replace timestamp with Firestore Timestamp for better querying
    // imageUri is kept as local path (will only work on same device)
    const scanData = {
      ...scan,
      userId,
      timestamp: Timestamp.fromMillis(scan.timestamp),
      // Also convert nested pricingData.timestamp if it exists
      pricingData: scan.pricingData ? {
        ...scan.pricingData,
        timestamp: Timestamp.fromMillis(scan.pricingData.timestamp),
      } : undefined,
      // Note: imageUri is local path - won't sync across devices (free tier limitation)
    };

    // Remove undefined fields recursively (Firestore doesn't allow them)
    const removeUndefined = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
      }

      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = removeUndefined(value);
        }
      });
      return cleaned;
    };

    const cleanedScanData = removeUndefined(scanData);

    await setDoc(scanRef, cleanedScanData);

    // Increment scan count in user profile
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentCount = userSnap.data().scanCount || 0;
      await updateDoc(userRef, {
        scanCount: currentCount + 1,
        updatedAt: Date.now(),
      });
    }

    console.log('✅ Scan saved to Firestore:', scan.id);
  } catch (error: any) {
    console.error('❌ Error saving scan:', error.message);
    throw new Error('Failed to save scan');
  }
};

/**
 * Load all scans for a user from Firestore
 * Returns scans ordered by timestamp (newest first)
 */
export const loadScans = async (
  userId: string,
  maxResults: number = 50
): Promise<HistoryItem[]> => {
  try {
    const scansRef = collection(db, 'users', userId, 'scans');
    const q = query(scansRef, orderBy('timestamp', 'desc'), limit(maxResults));

    const querySnapshot = await getDocs(q);

    const scans: HistoryItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Convert Firestore Timestamp back to milliseconds
      // Handle both top-level timestamp and nested pricingData.timestamp
      const scan: HistoryItem = {
        ...data,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp,
        pricingData: data.pricingData ? {
          ...data.pricingData,
          timestamp: data.pricingData.timestamp?.toMillis
            ? data.pricingData.timestamp.toMillis()
            : data.pricingData.timestamp,
        } : undefined,
      } as HistoryItem;

      scans.push(scan);
    });

    console.log(`✅ Loaded ${scans.length} scans from Firestore`);
    return scans;
  } catch (error: any) {
    console.error('❌ Error loading scans:', error.message);
    throw new Error('Failed to load scans');
  }
};

/**
 * Delete a scan from Firestore
 */
export const deleteScan = async (userId: string, scanId: string): Promise<void> => {
  try {
    const scanRef = doc(db, 'users', userId, 'scans', scanId);
    await deleteDoc(scanRef);

    // Decrement scan count in user profile
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentCount = userSnap.data().scanCount || 0;
      await updateDoc(userRef, {
        scanCount: Math.max(0, currentCount - 1), // Don't go below 0
        updatedAt: Date.now(),
      });
    }

    console.log('✅ Scan deleted from Firestore:', scanId);
  } catch (error: any) {
    console.error('❌ Error deleting scan:', error.message);
    throw new Error('Failed to delete scan');
  }
};

/**
 * Delete all scans for a user from Firestore
 * Uses batched writes for better performance
 */
export const clearAllScans = async (userId: string): Promise<void> => {
  try {
    const scansRef = collection(db, 'users', userId, 'scans');
    const querySnapshot = await getDocs(scansRef);

    // Use batch to delete all scans
    const batch = writeBatch(db);

    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    // Reset scan count in user profile
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      scanCount: 0,
      updatedAt: Date.now(),
    });

    console.log('✅ All scans cleared from Firestore');
  } catch (error: any) {
    console.error('❌ Error clearing scans:', error.message);
    throw new Error('Failed to clear scans');
  }
};

/**
 * Get a single scan by ID
 */
export const getScan = async (userId: string, scanId: string): Promise<HistoryItem | null> => {
  try {
    const scanRef = doc(db, 'users', userId, 'scans', scanId);
    const scanSnap = await getDoc(scanRef);

    if (scanSnap.exists()) {
      const data = scanSnap.data();

      // Convert Firestore Timestamp back to milliseconds
      // Handle both top-level timestamp and nested pricingData.timestamp
      const scan: HistoryItem = {
        ...data,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp,
        pricingData: data.pricingData ? {
          ...data.pricingData,
          timestamp: data.pricingData.timestamp?.toMillis
            ? data.pricingData.timestamp.toMillis()
            : data.pricingData.timestamp,
        } : undefined,
      } as HistoryItem;

      return scan;
    }

    console.log('⚠️ Scan not found:', scanId);
    return null;
  } catch (error: any) {
    console.error('❌ Error loading scan:', error.message);
    throw new Error('Failed to load scan');
  }
};

/**
 * Update scan count for user
 * Useful for batch operations
 */
export const updateScanCount = async (userId: string, count: number): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      scanCount: count,
      updatedAt: Date.now(),
    });

    console.log('✅ Scan count updated:', count);
  } catch (error: any) {
    console.error('❌ Error updating scan count:', error.message);
    throw new Error('Failed to update scan count');
  }
};
