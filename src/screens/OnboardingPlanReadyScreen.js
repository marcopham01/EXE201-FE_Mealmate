import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePremium } from '../context/PremiumContext';

export default function OnboardingPlanReadyScreen({ navigation }) {
  const { refreshPremiumStatus } = usePremium();
  
  // Refresh premium status khi meal plan đã sẵn sàng (hoàn thành onboarding)
  React.useEffect(() => {
    refreshPremiumStatus();
  }, [refreshPremiumStatus]);
  
  const handleConfirm = async () => {
    // Refresh lại một lần nữa trước khi về Main để đảm bảo premium status được cập nhật
    // Đợi refresh hoàn tất để đảm bảo HomeScreen hiển thị đúng trạng thái premium
    await refreshPremiumStatus();
    // Navigate về Main (HomeScreen) - HomeScreen sẽ tự động refresh khi focus
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kế hoạch bữa ăn cá nhân của bạn đã sẵn sàng</Text>
      <View style={styles.card}>
        <Row left="Tổng lượng calo" right="2.409 Cal" first />
        <Row left="Bữa sáng" right="481 Cal" />
        <Row left="Bữa trưa" right="843 Cal" />
        <Row left="Bữa tối" right="602 Cal" />
        <Row left="Bữa phụ" right="481 Cal" last />
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleConfirm}>
        <Text style={styles.btnText}>Xác nhận</Text>
      </TouchableOpacity>
    </View>
  );
}

function Row({ left, right, first, last }) {
  return (
    <View style={[styles.row, first && { marginTop: 12 }, last && { marginBottom: 12 }]}>
      <Text style={styles.rowLeft}>{left}</Text>
      <View style={styles.pill}><Text style={styles.pillText}>{right}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5F3', padding: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#111', marginTop: 24 },
  card: { backgroundColor: '#fff', paddingHorizontal: 16, borderRadius: 16, marginTop: 24, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLeft: { fontSize: 18, color: '#3C2C21', fontWeight: '800' },
  pill: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  pillText: { color: '#3C2C21', fontWeight: '900' },
  btn: { position: 'absolute', bottom: 32, left: 24, right: 24, backgroundColor: '#F1CF82', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#3C2C21', fontWeight: '900', fontSize: 18 },
});


