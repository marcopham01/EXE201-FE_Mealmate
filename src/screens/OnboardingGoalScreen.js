import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function OnboardingGoalScreen({ navigation }) {
  const [goal, setGoal] = React.useState(null);

  const next = () => {
    navigation.navigate('OnboardingActivity', { goal });
  };

  const Option = ({ label, value }) => (
    <TouchableOpacity
      onPress={() => setGoal(value)}
      style={[styles.option, goal === value && styles.optionActive]}
    >
      <Text style={[styles.optionText, goal === value && styles.optionTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'<'}</Text></TouchableOpacity>
        <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: '14%' }]} /></View>
      </View>

      <Text style={styles.title}>Mục tiêu của bạn là gì?</Text>
      <Text style={styles.subtitle}>Điều này được sử dụng để tạo ra kết quả cá nhân hóa và lập kế hoạch cho bạn.</Text>

      <View style={{ height: 24 }} />
      <Option label="Giảm cân" value="lose" />
      <Option label="Duy trì cân nặng" value="maintain" />
      <Option label="Tăng cân" value="gain" />

      <View style={{ flex: 1 }} />
      <TouchableOpacity disabled={!goal} onPress={next} style={[styles.nextBtn, !goal && { opacity: 0.6 }]}> 
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
  option: { backgroundColor: '#EDEBE9', paddingVertical: 18, paddingHorizontal: 16, borderRadius: 16, marginTop: 16 },
  optionActive: { backgroundColor: '#D8D5D2' },
  optionText: { fontSize: 18, fontWeight: '800', color: '#222' },
  optionTextActive: { color: '#000' },
  nextBtn: { backgroundColor: '#F1CF82', borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  nextText: { color: '#3C2C21', fontWeight: '900', fontSize: 18 },
});


