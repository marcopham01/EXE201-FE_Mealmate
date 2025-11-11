import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePremium } from '../context/PremiumContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

function bmiLevel(bmi) {
  if (bmi < 18.5) return { label: 'Thiếu cân', color: '#1E88E5', desc: 'Chỉ số BMI cho thấy bạn đang thiếu cân. Hãy ưu tiên chế độ ăn đủ năng lượng và giàu dinh dưỡng để tăng cân lành mạnh.' };
  if (bmi < 25) return { label: 'Bình thường', color: '#34A853', desc: 'Bạn có BMI khỏe mạnh! Chúng tôi sẽ cá nhân hóa thực đơn để giúp bạn duy trì thể trạng hiện tại.' };
  if (bmi < 30) return { label: 'Thừa cân', color: '#FBBC05', desc: 'Chỉ số BMI cho thấy bạn đang thừa cân. Chúng tôi sẽ tối ưu lượng calo giúp bạn giảm cân bền vững.' };
  return { label: 'Béo phì', color: '#EA4335', desc: 'Chỉ số BMI ở mức béo phì. Hãy ưu tiên kế hoạch giảm cân an toàn với khẩu phần kiểm soát calo và giàu dinh dưỡng.' };
}

export default function OnboardingBMIResultScreen({ route, navigation }) {
  const { goal, activity, height, weight, bmi } = route.params || {};
  const { refreshPremiumStatus } = usePremium();
  
  // Refresh premium status sau khi tính BMI xong (đã thanh toán và nhập thông tin)
  React.useEffect(() => {
    refreshPremiumStatus();
    // Lưu thông tin BMI và thông số cơ bản để dùng cho phân tích sau này
    (async () => {
      try {
        const profile = { goal, activity, height, weight, bmi };
        await AsyncStorage.setItem('userProfileBMI', JSON.stringify(profile));
      } catch (e) {
        // ignore
      }
    })();
  }, [refreshPremiumStatus]);
  
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
          <Text style={[styles.bmiValue, { color: lvl.color }]}>{bmi}</Text>
          <View style={[styles.badge, { backgroundColor: lvl.color }]}>
            <Text style={styles.badgeText}>{lvl.label}</Text>
          </View>
        </View>
        <Text style={styles.desc}>{lvl.desc}</Text>
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


