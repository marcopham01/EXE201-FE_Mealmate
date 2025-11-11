import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FixedHeader from '../components/FixedHeader';
import WeekStrip from '../components/WeekStrip';
import { useWeek } from '../context/WeekContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePremium } from '../context/PremiumContext';
import { getLatestMealPlan, getAllMeals, recommendMealsByBMI } from '../api/meals';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AnalyzeScreen() {
  const navigation = useNavigation();
  const { premiumActive, refreshPremiumStatus } = usePremium();
  const [mealPlan, setMealPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [bmiProfile, setBmiProfile] = React.useState(null);
  
  const today = new Date();
  const dayIndexMon0 = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setHours(0,0,0,0);
  monday.setDate(today.getDate() - dayIndexMon0);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const weekLabels = ['T2','T3','T4','T5','T6','T7','CN'];
  const { selectedDayIdx, setSelectedDayIdx } = useWeek();

  // Fetch meal plan khi màn hình focus
  useFocusEffect(
    React.useCallback(() => {
      const now = new Date();
      const idx = (now.getDay() + 6) % 7;
      setSelectedDayIdx(idx);
      
      // Refresh premium status khi quay lại AnalyzeScreen
      // Đặc biệt quan trọng sau khi hoàn thành thanh toán và onboarding
      refreshPremiumStatus();
      
      // Fetch profile + meal plan or generate if missing
      const fetchData = async () => {
        // Sau khi refresh, kiểm tra lại premiumActive từ context
        // Note: premiumActive có thể chưa cập nhật ngay sau refresh
        // nên chúng ta sẽ dựa vào kết quả từ API meal plan
        try {
          // Load BMI profile (lưu từ onboarding)
          const raw = await AsyncStorage.getItem('userProfileBMI');
          const profile = raw ? JSON.parse(raw) : null;
          setBmiProfile(profile);

          // Thử lấy meal plan từ backend
          const plan = await getLatestMealPlan();
          if (plan) {
            setMealPlan(plan);
          } else if (profile?.height && profile?.weight) {
            // Nếu backend chưa có, gọi API gợi ý theo BMI nếu đã có profile
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
            const payload = {
              heightCm: Number(profile.height),
              weightKg: Number(profile.weight),
              activityLevel: mapActivity(profile.activity),
              goal: mapGoal(profile.goal),
            };
            const data = await recommendMealsByBMI(payload);
            if (data) {
              // Chuẩn hóa về shape cũ { result: { calorieTarget, breakdown } }
              setMealPlan({
                result: {
                  calorieTarget: data.calorieTarget,
                  breakdown: data.breakdown || { breakfast: 0, lunch: 0, dinner: 0 },
                  bmi: data.bmi,
                  bmiClass: data.bmiClass,
                  selected: data.meals || {},
                },
              });
            } else {
              // Fallback local khi API không trả về
              const generated = await generateWeeklyPlan(profile);
              setMealPlan(generated);
            }
          } else {
            // Không có profile -> fallback local nhẹ
            const generated = await generateWeeklyPlan(profile);
            setMealPlan(generated);
          }
          setLoading(false);
        } catch (error) {
          console.error('Error fetching meal plan:', error);
          try {
            const raw = await AsyncStorage.getItem('userProfileBMI');
            const profile = raw ? JSON.parse(raw) : null;
            setBmiProfile(profile);
            const generated = await generateWeeklyPlan(profile);
            setMealPlan(generated);
          } catch (e) {
            setMealPlan(null);
          }
          setLoading(false);
        }
      };
      
      if (premiumActive) {
        setLoading(true);
        fetchData();
      } else {
        setMealPlan(null);
        setLoading(false);
      }
    }, [premiumActive, setSelectedDayIdx, refreshPremiumStatus])
  );

  // Heuristic: calorie target theo BMI
  const calcTargetFromBMI = (profile) => {
    const bmi = profile?.bmi || 22;
    if (bmi < 18.5) return 2600;
    if (bmi < 25) return 2400;
    if (bmi < 30) return 2000;
    return 1800;
  };

  // Tạo kế hoạch tuần đơn giản từ DB meals có totalKcal
  const generateWeeklyPlan = async (profile) => {
    try {
      const target = calcTargetFromBMI(profile);
      const res = await getAllMeals({ page: 1, limit: 100 });
      const meals = Array.isArray(res?.data) ? res.data : [];

      // Chia tỷ lệ calo theo bữa
      const quotas = { breakfast: target * 0.25, lunch: target * 0.45, dinner: target * 0.30 };

      // Helper: chọn món gần quota cho từng mealTime
      const pickFor = (list, quota) => {
        const sorted = list
          .filter(m => typeof m.totalKcal === 'number' && m.totalKcal > 0)
          .sort((a, b) => Math.abs(a.totalKcal - quota) - Math.abs(b.totalKcal - quota));
        return sorted[0] || null;
      };

      const breakfastList = meals.filter(m => (m.mealTime || []).includes('breakfast'));
      const lunchList = meals.filter(m => (m.mealTime || []).includes('lunch'));
      const dinnerList = meals.filter(m => (m.mealTime || []).includes('dinner'));

      const b = pickFor(breakfastList, quotas.breakfast);
      const l = pickFor(lunchList, quotas.lunch);
      const d = pickFor(dinnerList, quotas.dinner);

      const breakdown = {
        breakfast: b?.totalKcal || 0,
        lunch: l?.totalKcal || 0,
        dinner: d?.totalKcal || 0,
      };

      return {
        result: {
          calorieTarget: target,
          breakdown,
          selected: { breakfast: b, lunch: l, dinner: d },
        },
      };
    } catch (e) {
      console.error('generateWeeklyPlan error:', e);
      return null;
    }
  };

  // Tính calories cho từng ngày trong tuần dựa trên meal plan
  const getDayCalories = (dayIndex) => {
    if (!mealPlan?.result?.breakdown) return 0;
    const { breakfast, lunch, dinner } = mealPlan.result.breakdown;
    // Tổng calories một ngày = breakfast + lunch + dinner
    const total = (breakfast || 0) + (lunch || 0) + (dinner || 0);
    return Math.round(total);
  };

  // Tính chiều cao cột dựa trên calories (normalize về 0-120px)
  const getBarHeight = (calories) => {
    const targetCal = mealPlan?.result?.calorieTarget || 2400;
    const maxCal = targetCal * 1.2; // Max là 120% của target
    const height = Math.min(120, Math.max(20, (calories / maxCal) * 120));
    return height;
  };

  // Màu sắc cho từng ngày (cùng tông màu vàng/cam nhưng khác độ đậm)
  const barColors = [
    '#F8E5A0', // T2 - vàng nhạt
    '#F5D67A', // T3 - vàng
    '#F2C763', // T4 - vàng đậm (màu hiện tại)
    '#F0B855', // T5 - cam nhạt
    '#EDAD47', // T6 - cam
    '#EBA239', // T7 - cam đậm
    '#E8982B', // CN - đỏ cam
  ];

  // Màu cho cột được chọn (đậm hơn)
  const activeBarColors = [
    '#E6D186', // T2
    '#E3C660', // T3
    '#E0BA49', // T4
    '#DDAE3B', // T5
    '#DAA22D', // T6
    '#D7961F', // T7
    '#D48A11', // CN
  ];

  const calorieTarget = mealPlan?.result?.calorieTarget || calcTargetFromBMI(bmiProfile) || 2400;
  const selectedDayCalories = getDayCalories(selectedDayIdx);
  const maxWeekCalories = Math.max(...weekLabels.map((_, idx) => getDayCalories(idx))) || calorieTarget;
  
  // Tính số calo vượt mức (nếu có)
  const overCalories = Math.max(0, selectedDayCalories - calorieTarget);

  const bmiValue = bmiProfile?.bmi ? Number(bmiProfile.bmi).toFixed(1) : null;
  const bmiLevel = (b) => {
    if (!b && b !== 0) return { label: '—', color: '#B7AEA5' };
    if (b < 18.5) return { label: 'Thiếu cân', color: '#1E88E5' };
    if (b < 25) return { label: 'Bình thường', color: '#34A853' };
    if (b < 30) return { label: 'Thừa cân', color: '#FBBC05' };
    return { label: 'Béo phì', color: '#EA4335' };
  };
  const bmiInfo = bmiLevel(Number(bmiValue));

  return (
    <SafeAreaView style={styles.container}>
      <FixedHeader onPressPremium={premiumActive ? undefined : () => navigation.navigate('Premium')} />
      <WeekStrip weekLabels={weekLabels} weekDates={weekDates} selectedIdx={selectedDayIdx} onChange={setSelectedDayIdx}/>
      <ScrollView 
        style={styles.body}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.softDivider} />
        {premiumActive ? (
          <View>
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <Text style={styles.sectionTitle}>Phân tích vào {weekDates[selectedDayIdx].toLocaleDateString('vi-VN')}</Text>
            </View>
            {!bmiProfile && !loading && (
              <View style={styles.ctaCard}>
                <Text style={styles.ctaTitle}>Chưa có dữ liệu BMI</Text>
                <Text style={styles.ctaSub}>Tính BMI để cá nhân hóa mục tiêu calo và phân tích chính xác hơn.</Text>
                <View style={{ height: 10 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
                  <Text onPress={() => navigation.navigate('OnboardingGoal')} style={styles.ctaBtn}>
                    Tính BMI
                  </Text>
                </View>
              </View>
            )}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F2C763" />
                <Text style={{ marginTop: 12, color: '#9A8E83' }}>Đang tải dữ liệu...</Text>
              </View>
            ) : mealPlan ? (
              <>
                <View style={styles.card}>
                  {/* BMI Row */}
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>BMI</Text>
                      <View style={styles.summaryValueRow}>
                        <Text style={[styles.summaryValue, { color: bmiInfo.color }]}>{bmiValue || '—'}</Text>
                        <View style={[styles.bmiBadge, { backgroundColor: bmiInfo.color }]}>
                          <Text style={styles.bmiBadgeText}>{bmiInfo.label}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.vDivider} />
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Mục tiêu calo</Text>
                      <Text style={styles.summaryValue}>{calorieTarget}</Text>
                    </View>
                  </View>

                  {/* Actions: recalc BMI / re-enter info */}
                  <View style={styles.actionRow}>
                    <Text onPress={() => navigation.navigate('OnboardingGoal')} style={styles.primaryAction}>
                      Tính lại BMI
                    </Text>
                    <Text
                      onPress={async () => {
                        try {
                          await AsyncStorage.removeItem('userProfileBMI');
                        } catch (e) {}
                        navigation.navigate('OnboardingGoal');
                      }}
                      style={styles.secondaryAction}
                    >
                      Nhập lại thông tin
                    </Text>
                  </View>

                  <Text style={[styles.cardTitle, { marginTop: 6 }]}>Lượng calo</Text>
                  <View style={styles.calColumn}>
                    {/* Vòng tròn duy trì */}
                    <View style={styles.ringBox}>
                      <View style={styles.ringOuter}>
                        <View style={styles.ringInner} />
                      </View>
                      <Text style={styles.ringLabel}>Duy trì</Text>
                      <Text style={styles.ringValue}>{calorieTarget}</Text>
                    </View>
                    {/* Biểu đồ tuần (bên dưới vòng tròn) */}
                    <View style={styles.chartArea}>
                      <View style={styles.barRow}>
                        {weekLabels.map((lb, idx) => {
                          const dayCalories = getDayCalories(idx);
                          const barHeight = getBarHeight(dayCalories);
                          const isSelected = idx === selectedDayIdx;
                          const display = dayCalories.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
                          return (
                            <View key={lb} style={styles.barCol}>
                              <View style={{ height: 120, justifyContent: 'flex-end', alignItems: 'center' }}>
                                <View 
                                  style={[
                                    styles.bar, 
                                    { 
                                      height: barHeight,
                                      backgroundColor: isSelected ? activeBarColors[idx] : barColors[idx]
                                    }
                                  ]} 
                                />
                              </View>
                              <Text style={[styles.barLabel, isSelected && styles.barLabelActive]}>{lb}</Text>
                              <Text style={[styles.barCalText, isSelected && styles.barCalTextActive]}>
                                {display}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      <View style={styles.overline}> 
                        <Text style={styles.overNum}>{overCalories}</Text>
                        <Text style={styles.overText}> vượt mức lượng Cal</Text>
                      </View>
                    </View>
                  </View>
                </View>
                {/* Nút Soạn thực đơn cả tuần - đặt bên ngoài card */}
                <TouchableOpacity 
                  style={styles.weeklyPlanButton}
                  onPress={() => navigation.navigate('WeeklyMealPlan', { 
                    calorieTarget,
                    breakdown: mealPlan.result.breakdown,
                    bmiProfile
                  })}
                >
                  <Text style={styles.weeklyPlanButtonText}>Soạn thực đơn cả tuần</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.card}>
                <Text style={{ color: '#9A8E83', textAlign: 'center', paddingVertical: 20 }}>
                  Chưa có meal plan. Vui lòng tạo meal plan từ onboarding để xem phân tích.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="crown" size={64} color="#B7AEA5" style={{ marginBottom: 22 }} />
            <Text style={styles.lockTitle}>Mở gói cao cấp để sử dụng tính năng này</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1, backgroundColor: '#F6F4F2' },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  softDivider: { height: 1, backgroundColor: '#EEE9E2', marginHorizontal: 16, opacity: 0.7 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 },
  lockTitle: { color: '#958A7B', fontWeight: '800', fontSize: 22, textAlign: 'center', maxWidth: width * 0.87, lineHeight: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#3C2C21' },
  card: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontWeight: '900', color: '#3C2C21', fontSize: 18, marginBottom: 12 },
  ctaCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF9E8', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F5E5B8' },
  ctaTitle: { color: '#3C2C21', fontWeight: '900', fontSize: 16 },
  ctaSub: { color: '#7D6E62', marginTop: 6 },
  ctaBtn: { backgroundColor: '#F2C763', color: '#3C2C21', fontWeight: '900', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  primaryAction: { backgroundColor: '#3C2C21', color: '#FAE2AF', fontWeight: '900', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, overflow: 'hidden' },
  secondaryAction: { backgroundColor: '#FFFFFF', color: '#3C2C21', fontWeight: '900', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E6E0DA' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F6F3', borderRadius: 12, padding: 12 },
  summaryItem: { flex: 1 },
  summaryLabel: { color: '#7D6E62', fontWeight: '800', fontSize: 12 },
  summaryValueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  summaryValue: { color: '#3C2C21', fontWeight: '900', fontSize: 18, marginRight: 8 },
  bmiBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  bmiBadgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  vDivider: { width: 1, height: 32, backgroundColor: '#E8E2DC', marginHorizontal: 12 },
  calColumn: { flexDirection: 'column', alignItems: 'center' },
  ringBox: { width: 120, alignItems: 'center', alignSelf: 'center' },
  ringOuter: { width: 100, height: 100, borderRadius: 100, backgroundColor: '#EFECE8', alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 82, height: 82, borderRadius: 82, backgroundColor: '#FFFFFF' },
  ringLabel: { position: 'absolute', top: 26, fontWeight: '900', color: '#6F5B4A' },
  ringValue: { position: 'absolute', top: 46, fontWeight: '900', fontSize: 22, color: '#3C2C21' },
  chartArea: { width: '100%', marginTop: 12, backgroundColor: '#FAF8F5', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F0ECE7' },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', height: 140 },
  barCol: { alignItems: 'center', width: 40 },
  bar: { width: 16, minHeight: 20, backgroundColor: '#E0DDD9', borderRadius: 8 },
  barLabel: { marginTop: 4, color: '#9A8E83', fontWeight: '800', fontSize: 14, width: 40, textAlign: 'center' },
  barLabelActive: { color: '#3C2C21', fontWeight: '900' },
  barCalText: { marginTop: 4, fontSize: 12, color: '#9A8E83', fontWeight: '700', width: 40, textAlign: 'center', lineHeight: 16 },
  barCalTextActive: { color: '#3C2C21', fontWeight: '900', fontSize: 12, width: 40, textAlign: 'center' },
  overline: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  overNum: { color: '#3C2C21', fontWeight: '900', marginRight: 6 },
  overText: { color: '#6F6760' },
  weeklyPlanButton: { backgroundColor: '#F2C763', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, marginHorizontal: 16, marginTop: 12, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  weeklyPlanButtonText: { color: '#3C2C21', fontWeight: '900', fontSize: 16 },
});
