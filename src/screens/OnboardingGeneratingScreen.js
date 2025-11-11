import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { usePremium } from '../context/PremiumContext';
import { recommendMealsByBMI } from '../api/meals';

export default function OnboardingGeneratingScreen({ route, navigation }) {
  const params = route.params || {};
  const { refreshPremiumStatus } = usePremium();
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Refresh premium status khi đang generate meal plan (đảm bảo status mới nhất)
    refreshPremiumStatus();

    const mapActivity = (a) => {
      const s = (a || '')
        .toString()
        .replace(/\u00A0/g, ' ')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[‘’'“”]/g, '')
        .replace(/\s+/g, ' ');
      if (s === 'low' || s.includes('it van dong') || s.includes('ít vận động')) return 'Ít vận động';
      if (s === 'high' || s.includes('van dong nhieu') || s.includes('vận động nhiều')) return 'Vận động nhiều';
      if (s === 'medium' || s.includes('van dong vua phai') || s.includes('vận động vừa phải')) return 'Vận động vừa phải';
      return 'Vận động vừa phải';
    };
    const mapGoal = (g) => {
      const s = (g || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (s === 'lose' || s.includes('giam')) return 'Giảm cân';
      if (s === 'gain' || s.includes('tang')) return 'Tăng cân';
      return 'Duy trì cân nặng';
    };

    const doGen = async () => {
      try {
        const payload = {
          heightCm: Number(params.height),
          weightKg: Number(params.weight),
          activityLevel: mapActivity(params.activity),
          goal: mapGoal(params.goal),
        };
        const data = await recommendMealsByBMI(payload);
        navigation.replace('OnboardingPlanReady', { 
          calorieTarget: data?.calorieTarget || 2400,
          breakdown: data?.breakdown || { breakfast: 480, lunch: 960, dinner: 960 },
        });
      } catch (e) {
        navigation.replace('OnboardingPlanReady', params);
      } finally {
        setLoading(false);
      }
    };

    doGen();
  }, [refreshPremiumStatus]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đang tạo kế hoạch bữa ăn cá nhân hóa...</Text>
      <View style={styles.circle}>
        {loading ? <ActivityIndicator size="large" color="#835E12" /> : <Text style={styles.percent}>99%</Text>}
      </View>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.replace('OnboardingPlanReady', params)}>
        <Text style={styles.btnText}>Xác nhận</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '900', color: '#1A1A1A', textAlign: 'center', marginBottom: 24 },
  circle: { width: 180, height: 180, borderRadius: 180, backgroundColor: '#F2D584', alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 40, fontWeight: '900', color: '#835E12' },
  btn: { position: 'absolute', bottom: 32, left: 24, right: 24, backgroundColor: '#F1CF82', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#3C2C21', fontWeight: '900', fontSize: 18 },
});


