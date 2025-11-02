import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ScrollPicker from '../components/ScrollPicker';

export default function OnboardingWeightScreen({ route, navigation }) {
  const { goal, activity, height } = route.params || {};
  const [weight, setWeight] = React.useState(75);

  const next = () => {
    const bmi = weight / Math.pow(height / 100, 2);
    navigation.navigate('OnboardingBMIResult', { goal, activity, height, weight, bmi: Number(bmi.toFixed(1)) });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
        <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: '70%' }]} /></View>
      </View>

      <Text style={styles.title}>Cân nặng của bạn?</Text>
      <Text style={styles.subtitle}>Điều này được sử dụng để tạo ra kết quả cá nhân hóa và lập kế hoạch cho bạn.</Text>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
        <ScrollPicker
          min={30}
          max={200}
          initial={75}
          unit="kg"
          onValueChange={setWeight}
        />
      </View>

      <TouchableOpacity onPress={next} style={styles.nextBtn}>
        <Text style={styles.nextText}>Tiếp theo  →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  back: { fontSize: 24, color: '#3C2C21', marginRight: 8 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: '#E6E2DE', borderRadius: 6 },
  progressBarFill: { height: 6, backgroundColor: '#F2C763', borderRadius: 6 },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginTop: 24 },
  subtitle: { fontSize: 16, color: '#9A928D', marginTop: 8 },
  nextBtn: { backgroundColor: '#F1CF82', borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  nextText: { color: '#3C2C21', fontWeight: '900', fontSize: 18 },
});


