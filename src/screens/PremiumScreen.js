import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ImageBackground } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createPaymentLink } from '../api/payment';
import { useNavigation } from '@react-navigation/native';
import { usePremium } from '../context/PremiumContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushLocalNotification } from '../utils/notifications';

export default function PremiumScreen({ navigation }) {
  const [loading, setLoading] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { setPremiumActive, refreshPremiumStatus } = usePremium();

  const startTrial = async () => {
    if (loading) return; setLoading(true);
    try {
      const res = await createPaymentLink({ premiumPackageType: 'trial' });
      setPremiumActive(true);
      // Refresh premium status từ server để đảm bảo đồng bộ
      refreshPremiumStatus();
      // Push cục bộ: dùng thử thành công
      pushLocalNotification({ title: 'Gói cao cấp', body: 'Kích hoạt dùng thử thành công!' });
      alert(res?.message || 'Kích hoạt dùng thử thành công');
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      alert(e.message || 'Không kích hoạt được dùng thử');
    } finally { setLoading(false); }
  };

  const payMonthly = async () => {
    if (loading) return; setLoading(true);
    try {
      const res = await createPaymentLink({ premiumPackageType: 'monthly' });
      const url = res?.data?.checkout_url || res?.checkout_url;
      const orderCode = res?.data?.order_code || res?.order_code;
      const token = await AsyncStorage.getItem('accessToken');
      if (url) {
        navigation.navigate('PaymentWeb', { url, orderCode, token });
      } else {
        alert('Không nhận được link thanh toán');
      }
    } catch (e) {
      alert(e.message || 'Không tạo được link thanh toán');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={require('../../assets/images/MealMate Logo.png')} style={styles.bg} resizeMode="cover">
        <View style={styles.overlay} />
      </ImageBackground>

      <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.closeBtn, { top: insets.top + 8 }]} accessibilityLabel="Đóng">
        <Ionicons name="close" size={34} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.centerWrap}>
        <View style={styles.card}>
          <View style={styles.crownRow}>
            <LinearGradient colors={["#F2E7B9", "#E6C56E"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.crownBadge}>
              <MaterialCommunityIcons name="crown" size={24} color="#5A3E2B" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Gói cao cấp</Text>
          <Text style={styles.subtitle}>Trải nghiệm cao cấp, tối ưu sức khỏe</Text>

          <Feature text="Nhập chỉ số cơ thể để tính BMI" />
          <Feature text="Chọn mục tiêu (giảm/tăng cân) để gợi ý meal phù hợp" />
          <Feature text="Soạn meal theo tuần với nhiều nguyên liệu" />
          <Feature text="Unlimited soạn meal (bản basic có giới hạn)" />

          <TouchableOpacity activeOpacity={0.9} onPress={startTrial} style={styles.btnOutline}>
            <Text style={styles.btnOutlineText}>{loading ? 'Đang xử lý...' : 'Dùng thử 3 ngày miễn phí'}</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.9} onPress={payMonthly}>
            <LinearGradient colors={["#E8D29D", "#F8CF73"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnSolid}>
              <Text style={styles.btnSolidText}>{loading ? 'Đang tạo link...' : 'Thanh toán ngay'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Feature({ text }) {
  return (
    <View style={styles.featureRow}>
      <MaterialCommunityIcons name="check-decagram" size={18} color="#F0E1A8" style={{ marginRight: 10 }} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bg: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
  closeBtn: { position: 'absolute', left: 16, zIndex: 2 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: 'rgba(20,20,20,0.6)',
    borderRadius: 24,
    paddingVertical: 22, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  crownRow: { alignItems: 'center', marginBottom: 6 },
  crownBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginTop: 6 },
  subtitle: { color: '#D8D1C9', textAlign: 'center', marginTop: 4, marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  featureText: { color: '#EEEAE6', fontSize: 16, lineHeight: 24, flex: 1 },
  btnOutline: { marginTop: 22, borderRadius: 24, borderWidth: 2, borderColor: '#FFFFFF', paddingVertical: 14, alignItems: 'center' },
  btnOutlineText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  btnSolid: { marginTop: 12, borderRadius: 24, paddingVertical: 16, alignItems: 'center' },
  btnSolidText: { color: '#3C2C21', fontWeight: '900', fontSize: 16 },
});
