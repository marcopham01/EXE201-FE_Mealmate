import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function OnboardingGeneratingScreen({ route, navigation }) {
  const params = route.params || {};
  React.useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace('OnboardingPlanReady', params);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đang tạo kế hoạch bữa ăn cá nhân hóa...</Text>
      <View style={styles.circle}><Text style={styles.percent}>99%</Text></View>
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


