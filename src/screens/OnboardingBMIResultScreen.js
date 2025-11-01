import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

function bmiLevel(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#1E88E5' };
  if (bmi < 25) return { label: 'Normal', color: '#34A853' };
  if (bmi < 30) return { label: 'Overweight', color: '#FBBC05' };
  return { label: 'Obese', color: '#EA4335' };
}

export default function OnboardingBMIResultScreen({ route, navigation }) {
  const { goal, activity, height, weight, bmi } = route.params || {};
  const next = () => navigation.navigate('OnboardingGenerating', { goal, activity, height, weight, bmi });
  const lvl = bmiLevel(bmi);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
        <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: '84%' }]} /></View>
      </View>

      <Text style={styles.title}>Chỉ số BMI của bạn</Text>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.bmiLabel}>BMI:</Text>
          <Text style={[styles.bmiValue, { color: '#2E7D32' }]}>{bmi}</Text>
          <View style={[styles.badge, { backgroundColor: lvl.color }]}>
            <Text style={styles.badgeText}>{lvl.label}</Text>
          </View>
        </View>
        <Text style={styles.desc}>Bạn có BMI khỏe mạnh! Chúng tôi sẽ sử dụng thông tin này để tạo ra các chương trình cá nhân hóa nhằm duy trì thể lực của bạn</Text>
      </View>

      <View style={{ flex: 1 }} />
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
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginTop: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  bmiLabel: { fontSize: 22, fontWeight: '900', color: '#222' },
  bmiValue: { fontSize: 28, fontWeight: '900' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { color: '#fff', fontWeight: '900' },
  desc: { marginTop: 12, color: '#8E8B88' },
  nextBtn: { backgroundColor: '#F1CF82', borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  nextText: { color: '#3C2C21', fontWeight: '900', fontSize: 18 },
});


