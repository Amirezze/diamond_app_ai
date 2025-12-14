import { DiamondHistory } from '@/components/DiamondHistory';
import { Alert, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { useEffect } from 'react';
import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { useHistory, useIsLoadingHistory, useIsAuthenticated } from '@/store/hooks';
import { loadHistoryFromStorage, deleteHistoryItem, clearAllHistory } from '@/store/diamondSlice';
import { router } from 'expo-router';

export default function HistoryTab() {
  const dispatch = useAppDispatch();
  const history = useHistory();
  const isLoadingHistory = useIsLoadingHistory();
  const isAuthenticated = useIsAuthenticated();
  const [deleteCallback, setDeleteCallback] = React.useState<(() => void) | null>(null);

  // Load history when authenticated or when component mounts
  useEffect(() => {
    dispatch(loadHistoryFromStorage());
  }, [dispatch, isAuthenticated]); // Reload when auth state changes

  const handleHistoryItemPress = (item: any) => {
    // Navigate to history detail screen
    router.push({
      pathname: '/history-detail',
      params: { id: item.id }
    });
  };

  const handleLongPress = (item: any) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan from your history?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteHistoryItem(item.id)).unwrap();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All',
      `Delete all ${history.length} scans?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(clearAllHistory()).unwrap();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (isLoadingHistory) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#e4c078" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DiamondHistory
        historyItems={history}
        onItemPress={handleHistoryItemPress}
        onLongPress={handleLongPress}
        onClearAll={handleClearAll}
        isAuthenticated={isAuthenticated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});