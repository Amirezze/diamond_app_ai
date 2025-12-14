import { Header } from '@/components/Header';
import { MainSection } from '@/components/MainSection';
import { StyleSheet, View } from "react-native";

export default function HomeTab() {


  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <MainSection />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    overflow: 'visible',
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingTop: 0,
    marginTop: 0,
    position: 'relative',
    overflow: 'visible',
    backgroundColor: '#ffffff',
  },
});