import { DiamondResult } from '@/components/DiamondResult';
import { router, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useHistory } from '@/store/hooks';

export default function HistoryDetailScreen() {
  const params = useLocalSearchParams();
  const history = useHistory();

  // Find the history item by ID
  const historyItem = history.find(item => item.id === params.id);

  if (!historyItem) {
    router.back();
    return null;
  }

  // Convert history item to the format expected by DiamondResult
  const scannedImage = {
    uri: historyItem.imageUri,
  };

  const cutPrediction = {
    id: historyItem.id,
    timestamp: historyItem.timestamp,
    imageUri: historyItem.imageUri,
    cutGrade: historyItem.cutGrade,
    confidence: historyItem.cutConfidence,
    allProbabilities: historyItem.allProbabilities,
  };

  const shapeDetection = {
    shape: historyItem.shape,
    confidence: historyItem.shapeConfidence,
    timestamp: historyItem.timestamp,
  };

  // Add color prediction if available
  const colorPrediction = historyItem.colorGrade ? {
    id: historyItem.id,
    timestamp: historyItem.timestamp,
    imageUri: historyItem.imageUri,
    colorGrade: historyItem.colorGrade,
    confidence: historyItem.colorConfidence || 0,
    allProbabilities: historyItem.colorAllProbabilities || {},
  } : undefined;

  // Add clarity prediction if available
  const clarityPrediction = historyItem.clarityGrade ? {
    id: historyItem.id,
    timestamp: historyItem.timestamp,
    imageUri: historyItem.imageUri,
    clarityGrade: historyItem.clarityGrade,
    confidence: historyItem.clarityConfidence || 0,
    allProbabilities: historyItem.clarityAllProbabilities || {},
  } : undefined;

  const handleBack = () => {
    router.back();
  };

  const handleScanAgain = () => {
    router.push('/camera');
  };

  return (
    <View style={styles.container}>
      <DiamondResult
        scannedImage={scannedImage}
        cutPrediction={cutPrediction}
        colorPrediction={colorPrediction}
        clarityPrediction={clarityPrediction}
        shapeDetection={shapeDetection}
        caratWeight={historyItem.caratWeight}
        savedPricingData={historyItem.pricingData}
        onBack={handleBack}
        onScanAgain={handleScanAgain}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
