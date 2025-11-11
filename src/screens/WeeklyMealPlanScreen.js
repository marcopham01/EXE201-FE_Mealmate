import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FixedHeader from '../components/FixedHeader';
import { useMeals } from '../context/MealsContext';
import { getAllMeals } from '../api/meals';
import { usePremium } from '../context/PremiumContext';

const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MEAL_LABELS = ['Sáng', 'Trưa', 'Tối'];
const MEAL_TIMES = ['breakfast', 'lunch', 'dinner'];

export default function WeeklyMealPlanScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { premiumActive } = usePremium();
  const { setMealForDate, getMealsForDate } = useMeals();
  
  const params = route?.params || {};
  const calorieTarget = params.calorieTarget || 2000;
  const breakdown = params.breakdown || { breakfast: 500, lunch: 800, dinner: 700 };
  
  const [loading, setLoading] = React.useState(false);
  const [mealsFromAPI, setMealsFromAPI] = React.useState([]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const hasLoadedRef = React.useRef(false); // Dùng ref để track đã load chưa, tránh re-render
  
  // Tính toán tuần hiện tại (từ thứ 2 đến chủ nhật) - memoize để tránh tạo mới mỗi lần render
  const today = React.useMemo(() => new Date(), []); // Tạo today một lần khi mount
  const weekDates = React.useMemo(() => {
    const dayIndexMon0 = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(today.getDate() - dayIndexMon0);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [today]); // Phụ thuộc vào today
  
  // Refresh khi quay lại từ RecipeScreen
  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey(prev => prev + 1);
    }, [])
  );
  
  // Hàm chọn meal gần nhất với target calories
  const pickMealForTarget = (meals, targetCal, excludeIds = []) => {
    const available = meals.filter(m => 
      typeof m.totalKcal === 'number' && 
      m.totalKcal > 0 && 
      !excludeIds.includes(m.id)
    );
    if (available.length === 0) return null;
    
    // Sắp xếp theo độ gần với target calories
    const sorted = available.sort((a, b) => 
      Math.abs(a.totalKcal - targetCal) - Math.abs(b.totalKcal - targetCal)
    );
    return sorted[0];
  };
  
  // Reset ref khi premiumActive thay đổi từ false sang true
  React.useEffect(() => {
    if (!premiumActive) {
      hasLoadedRef.current = false; // Reset khi premium không active
    }
  }, [premiumActive]);
  
  // Load meals từ API và tự động generate meal plan - chỉ chạy một lần khi mount hoặc premiumActive thay đổi
  React.useEffect(() => {
    if (!premiumActive || hasLoadedRef.current) return; // Đã load rồi thì không load lại
    
    let isMounted = true; // Flag để tránh setState sau khi unmount
    
    const loadMeals = async () => {
      setLoading(true);
      try {
        let allMeals = [];
        let currentPage = 1;
        const limit = 50;
        let hasMore = true;
        
        while (hasMore && allMeals.length < 200 && isMounted) {
          try {
            const result = await getAllMeals({ page: currentPage, limit });
            if (result && result.data && Array.isArray(result.data)) {
              allMeals = [...allMeals, ...result.data];
              hasMore = result.pagination?.hasNextPage || false;
              currentPage++;
            } else {
              hasMore = false;
            }
          } catch (error) {
            console.error('Error fetching meals page:', error);
            hasMore = false;
          }
        }
        
        if (!isMounted) return; // Component đã unmount, không setState
        
        hasLoadedRef.current = true; // Đánh dấu đã load
        setMealsFromAPI(allMeals);
        
        // Tự động generate meal plan cho cả tuần nếu chưa có
        if (allMeals.length > 0) {
          // Phân loại meals theo mealTime
          const breakfastMeals = allMeals.filter(m => (m.mealTime || []).includes('breakfast'));
          const lunchMeals = allMeals.filter(m => (m.mealTime || []).includes('lunch'));
          const dinnerMeals = allMeals.filter(m => (m.mealTime || []).includes('dinner'));
          
          // Track meals đã dùng để đảm bảo mỗi ngày khác nhau
          const usedMealIds = new Set();
          
          weekDates.forEach((date, dayIdx) => {
            MEAL_TIMES.forEach((mealTime) => {
              // Kiểm tra xem đã có meal cho bữa này chưa
              const existing = getMealsForDate(date)?.[mealTime];
              if (existing) return; // Đã có meal, không tự động generate
              
              const targetCal = breakdown[mealTime] || 0;
              let mealList = [];
              
              if (mealTime === 'breakfast') mealList = breakfastMeals;
              else if (mealTime === 'lunch') mealList = lunchMeals;
              else if (mealTime === 'dinner') mealList = dinnerMeals;
              
              // Chọn meal gần nhất với target, tránh dùng lại
              const selectedMeal = pickMealForTarget(mealList, targetCal, Array.from(usedMealIds));
              
              if (selectedMeal) {
                usedMealIds.add(selectedMeal.id);
                setMealForDate(date, mealTime, {
                  id: selectedMeal.id,
                  title: selectedMeal.title || selectedMeal.name || 'Món ăn',
                  desc: selectedMeal.desc || selectedMeal.description || '',
                  time: selectedMeal.time || '15 phút',
                });
              }
            });
          });
        }
      } catch (error) {
        console.error('Error loading meals:', error);
        if (isMounted) {
          setMealsFromAPI([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadMeals();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [premiumActive]); // Chỉ phụ thuộc vào premiumActive
  
  // Hàm chọn món cho một bữa
  const handleSelectMeal = (date, mealTime) => {
    // Navigate đến Main và sau đó đến tab Recipes
    navigation.navigate('Main', {
      screen: 'Recipes',
      params: {
        date: date.toISOString(),
        mealType: mealTime,
        calorieTarget: breakdown[mealTime] || 0,
      },
    });
  };
  
  // Lấy món đã chọn cho một bữa
  const getSelectedMeal = (date, mealTime) => {
    const meals = getMealsForDate(date);
    return meals?.[mealTime] || null;
  };
  
  // Format calories
  const fmtCal = (n) => `${Math.round(n).toLocaleString('vi-VN')} Cal`;
  
  // Kiểm tra xem đã chọn đủ meals cho cả tuần chưa
  const checkAllMealsSelected = () => {
    let allSelected = true;
    weekDates.forEach((date) => {
      MEAL_TIMES.forEach((mealTime) => {
        const meal = getMealsForDate(date)?.[mealTime];
        if (!meal) {
          allSelected = false;
        }
      });
    });
    return allSelected;
  };
  
  // Xử lý khi bấm nút Xác nhận
  const handleConfirm = async () => {
    try {
      // Lấy tất cả meals đã chọn cho cả tuần và lưu vào MealsContext
      // Tất cả meals (kể cả future days) đều được lưu vào MealsContext
      weekDates.forEach((date) => {
        MEAL_TIMES.forEach((mealTime) => {
          const meal = getMealsForDate(date)?.[mealTime];
          if (meal) {
            // Tìm meal đầy đủ từ mealsFromAPI để lấy thông tin đầy đủ
            const fullMeal = mealsFromAPI.find(m => m.id === meal.id) || meal;
            
            // Lưu meal đầy đủ vào MealsContext (đã có sẵn hoặc cập nhật)
            setMealForDate(date, mealTime, {
              id: fullMeal.id,
              title: fullMeal.title || fullMeal.name || meal.title,
              desc: fullMeal.desc || fullMeal.description || meal.desc,
              time: fullMeal.time || meal.time,
              totalKcal: fullMeal.totalKcal,
              mealTime: fullMeal.mealTime,
              image: fullMeal.image,
            });
          }
        });
      });
      
      // Navigate về AnalyzeScreen
      navigation.navigate('Main', { screen: 'Analytics' });
    } catch (error) {
      console.error('Error confirming weekly meal plan:', error);
    }
  };
  
  if (!premiumActive) {
    return (
      <SafeAreaView style={styles.container}>
        <FixedHeader onPressPremium={() => navigation.navigate('Premium')} />
        <View style={styles.body}>
          <View style={styles.centerContainer}>
            <Text style={styles.lockTitle}>Mở gói cao cấp để sử dụng tính năng này</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  // Nút back
  const backButton = (
    <TouchableOpacity 
      onPress={() => navigation.goBack()}
      style={styles.backButton}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-back" size={24} color="#3C2C21" />
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <FixedHeader extraRight={backButton} />
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Soạn thực đơn cả tuần</Text>
          <Text style={styles.subtitle}>Mục tiêu: {fmtCal(calorieTarget)}/ngày</Text>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F2C763" />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
          </View>
        ) : (
          weekDates.map((date, dayIdx) => {
            const dateStr = date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
            const isToday = date.toDateString() === today.toDateString();
            
            return (
              <View key={dayIdx} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{WEEK_LABELS[dayIdx]}</Text>
                  <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>{dateStr}</Text>
                </View>
                
                {MEAL_TIMES.map((mealTime, mealIdx) => {
                  const selectedMeal = getSelectedMeal(date, mealTime);
                  const targetCal = breakdown[mealTime] || 0;
                  
                  return (
                    <View key={mealIdx} style={styles.mealRow}>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealLabel}>{MEAL_LABELS[mealIdx]}</Text>
                        <Text style={styles.mealCal}>{fmtCal(targetCal)}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.mealButton, selectedMeal && styles.mealButtonSelected]}
                        onPress={() => handleSelectMeal(date, mealTime)}
                      >
                        {selectedMeal ? (
                          <View style={styles.selectedMeal}>
                            <Text style={styles.selectedMealTitle} numberOfLines={1}>
                              {selectedMeal.title}
                            </Text>
                            <Text style={styles.selectedMealDesc} numberOfLines={1}>
                              {selectedMeal.desc}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.mealButtonText}>Chọn món</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
        
        {/* Nút Xác nhận */}
        <View style={styles.confirmButtonContainer}>
          <TouchableOpacity 
            style={[styles.confirmButton, !checkAllMealsSelected() && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!checkAllMealsSelected()}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>Xác nhận</Text>
          </TouchableOpacity>
          {!checkAllMealsSelected() && (
            <Text style={styles.confirmHint}>Vui lòng chọn đủ món cho tất cả các bữa trong tuần</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1, backgroundColor: '#F6F4F2' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  lockTitle: { color: '#958A7B', fontWeight: '800', fontSize: 22, textAlign: 'center', lineHeight: 32 },
  header: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EEE9E2' },
  title: { fontSize: 24, fontWeight: '900', color: '#3C2C21', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#7D6E62', fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, color: '#7D6E62', fontSize: 16 },
  dayCard: { backgroundColor: '#FFFFFF', margin: 16, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0ECE7' },
  dayLabel: { fontSize: 18, fontWeight: '900', color: '#3C2C21', marginRight: 12 },
  dayDate: { fontSize: 16, color: '#7D6E62', fontWeight: '700' },
  dayDateToday: { color: '#F2C763', fontWeight: '900' },
  mealRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F8F6F3' },
  mealRowLast: { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 },
  mealInfo: { flex: 1 },
  mealLabel: { fontSize: 16, fontWeight: '800', color: '#3C2C21', marginBottom: 4 },
  mealCal: { fontSize: 14, color: '#7D6E62', fontWeight: '700' },
  mealButton: { backgroundColor: '#F8F6F3', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, minWidth: 120, alignItems: 'center', borderWidth: 1, borderColor: '#E6E0DA' },
  mealButtonSelected: { backgroundColor: '#FAE2AF', borderColor: '#F2C763' },
  mealButtonText: { color: '#3C2C21', fontWeight: '800', fontSize: 14 },
  selectedMeal: { alignItems: 'center', maxWidth: 140 },
  selectedMealTitle: { color: '#3C2C21', fontWeight: '900', fontSize: 14, textAlign: 'center', marginBottom: 2 },
  selectedMealDesc: { color: '#7D6E62', fontSize: 11, textAlign: 'center' },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  confirmButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: '#F2C763',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: '#E6E0DA',
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
  },
  confirmHint: {
    color: '#7D6E62',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '700',
  },
});

