import React from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FixedHeader from '../components/FixedHeader';
import WeekStrip from '../components/WeekStrip';
import { useWeek } from '../context/WeekContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePremium } from '../context/PremiumContext';
import { getLatestMealPlan } from '../api/meals';

export default function AnalyzeScreen() {
  const navigation = useNavigation();
  const { premiumActive } = usePremium();
  const [mealPlan, setMealPlan] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
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
      
      // Fetch meal plan
      const fetchMealPlan = async () => {
        if (premiumActive) {
          setLoading(true);
          try {
            const plan = await getLatestMealPlan();
            setMealPlan(plan);
          } catch (error) {
            console.error('Error fetching meal plan:', error);
            setMealPlan(null);
          } finally {
            setLoading(false);
          }
        } else {
          setMealPlan(null);
          setLoading(false);
        }
      };
      
      fetchMealPlan();
    }, [premiumActive, setSelectedDayIdx])
  );

  // Tính calories cho từng ngày trong tuần dựa trên meal plan
  const getDayCalories = (dayIndex) => {
    if (!mealPlan?.result?.breakdown) return 0;
    const { breakfast, lunch, dinner } = mealPlan.result.breakdown;
    // Tổng calories một ngày = breakfast + lunch + dinner
    return (breakfast || 0) + (lunch || 0) + (dinner || 0);
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

  const calorieTarget = mealPlan?.result?.calorieTarget || 2409;
  const selectedDayCalories = getDayCalories(selectedDayIdx);
  const maxWeekCalories = Math.max(...weekLabels.map((_, idx) => getDayCalories(idx))) || calorieTarget;
  
  // Tính số calo vượt mức (nếu có)
  const overCalories = Math.max(0, selectedDayCalories - calorieTarget);

  return (
    <SafeAreaView style={styles.container}>
      <FixedHeader onPressPremium={premiumActive ? undefined : () => navigation.navigate('Premium')} />
      <WeekStrip weekLabels={weekLabels} weekDates={weekDates} selectedIdx={selectedDayIdx} onChange={setSelectedDayIdx}/>
      <View style={styles.body}>
        <View style={styles.softDivider} />
        {premiumActive ? (
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <Text style={styles.sectionTitle}>Phân tích vào {weekDates[selectedDayIdx].toLocaleDateString('vi-VN')}</Text>
            </View>
            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#F2C763" />
                <Text style={{ marginTop: 12, color: '#9A8E83' }}>Đang tải dữ liệu...</Text>
              </View>
            ) : mealPlan ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Lượng calo</Text>
                <View style={styles.calRow}>
                  {/* Vòng tròn duy trì */}
                  <View style={styles.ringBox}>
                    <View style={styles.ringOuter}>
                      <View style={styles.ringInner} />
                    </View>
                    <Text style={styles.ringLabel}>Duy trì</Text>
                    <Text style={styles.ringValue}>{calorieTarget}</Text>
                  </View>
                  {/* Cột tuần */}
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={styles.barRow}>
                      {weekLabels.map((lb, idx) => {
                        const dayCalories = getDayCalories(idx);
                        const barHeight = getBarHeight(dayCalories);
                        const isSelected = idx === selectedDayIdx;
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
                              {dayCalories}
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
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1, backgroundColor: '#F6F4F2' },
  softDivider: { height: 1, backgroundColor: '#EEE9E2', marginHorizontal: 16, opacity: 0.7 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lockTitle: { color: '#958A7B', fontWeight: '800', fontSize: 22, textAlign: 'center', maxWidth: width * 0.87, lineHeight: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#3C2C21' },
  card: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontWeight: '900', color: '#3C2C21', fontSize: 18, marginBottom: 12 },
  calRow: { flexDirection: 'row', alignItems: 'center' },
  ringBox: { width: 120, alignItems: 'center' },
  ringOuter: { width: 100, height: 100, borderRadius: 100, backgroundColor: '#EFECE8', alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 82, height: 82, borderRadius: 82, backgroundColor: '#FFFFFF' },
  ringLabel: { position: 'absolute', top: 26, fontWeight: '900', color: '#6F5B4A' },
  ringValue: { position: 'absolute', top: 46, fontWeight: '900', fontSize: 22, color: '#3C2C21' },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', height: 140 },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 22, minHeight: 20, backgroundColor: '#E0DDD9', borderRadius: 8 },
  barLabel: { marginTop: 6, color: '#9A8E83', fontWeight: '800', fontSize: 12 },
  barLabelActive: { color: '#3C2C21', fontWeight: '900' },
  barCalText: { marginTop: 2, fontSize: 10, color: '#9A8E83', fontWeight: '700' },
  barCalTextActive: { color: '#3C2C21', fontWeight: '900', fontSize: 11 },
  overline: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  overNum: { color: '#3C2C21', fontWeight: '900', marginRight: 6 },
  overText: { color: '#6F6760' },
});
