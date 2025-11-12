import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useMeals } from '../context/MealsContext';
import FixedHeader from '../components/FixedHeader';
import { usePremium } from '../context/PremiumContext';
import { useSavedMeals } from '../context/SavedMealsContext';
import { getAllMeals } from '../api/meals';

const TOP_TABS = ['Mới nhất', 'Thực đơn'];
const MEAL_TABS = ['Sáng', 'Trưa', 'Tối'];
const WEEK_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MEAL_TIMES = ['breakfast', 'lunch', 'dinner'];

function RecipeCard({ meal, mealTimeIndex, onBookmarkPress, onAddPress, onRemovePress, selectionMode, isSelected }) {
  const { isMealSaved } = useSavedMeals();
  const isSaved = isMealSaved(meal.id, mealTimeIndex);
  const navigation = useNavigation();

  return (
    <TouchableOpacity 
      activeOpacity={0.88} 
      style={styles.recipeShadow}
      onPress={() => navigation.navigate('MealDetails', { mealId: meal.id, meal })}
    >
      <View style={styles.recipeCard}> 
        <View style={{ flex: 1, padding: 14 }}>
          <Text style={styles.recipeTitle}>{meal.title}</Text>
          <Text style={styles.recipeDesc}>{meal.desc}</Text>
          <Text style={styles.recipeTime}>Thời gian: {meal.time}</Text>
        </View>
        <View style={styles.recipeRight}>
          {/* Save (bookmark) always visible */}
          <TouchableOpacity
            onPress={() => onBookmarkPress && onBookmarkPress(meal)}
            activeOpacity={0.7}
            style={{ alignSelf: 'flex-end', margin: 10 }}
          >
            <Ionicons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={18} 
              color="#3C2C21" 
              style={{ opacity: isSaved ? 1 : 0.8 }} 
            />
          </TouchableOpacity>
          {/* Optional Remove if in selection mode and this meal is selected */}
          {selectionMode && isSelected && (
            <TouchableOpacity
              onPress={() => onRemovePress && onRemovePress(meal)}
              activeOpacity={0.85}
              style={{ position: 'absolute', top: 6, right: 8, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}
            >
              <Ionicons name="remove" size={16} color="#B00020" />
            </TouchableOpacity>
          )}
          {/* Add button always visible */}
          <TouchableOpacity
            onPress={() => onAddPress && onAddPress(meal)}
            activeOpacity={0.9}
            style={{ alignSelf: 'center', marginTop: 'auto', marginBottom: 12, backgroundColor: selectionMode ? '#3C2C21' : '#FFFFFF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: selectionMode ? 0 : 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: selectionMode ? 0 : 3 }}
          >
            <Ionicons name="add" size={16} color={selectionMode ? '#FAE2AF' : '#3C2C21'} />
            <Text style={{ marginLeft: 6, color: selectionMode ? '#FAE2AF' : '#3C2C21', fontWeight: '900', fontSize: 12 }}>{selectionMode ? 'THÊM' : 'Thêm'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RecipeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { premiumActive, refreshPremiumStatus } = usePremium();
  const { saveMeal, getSavedMealsByTime, determineMealTime } = useSavedMeals();
  const { setMealForDate, clearMealForDate, getMealsForDate } = useMeals();
  // Khởi tạo tab bữa ăn theo mealType từ route (nếu có)
  const paramsInit = route?.params || {};
  const initialMealIdx = paramsInit.mealType === 'lunch' ? 1 : paramsInit.mealType === 'dinner' ? 2 : 0;
  const initialTab = paramsInit.initialTab !== undefined ? paramsInit.initialTab : 0;
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [activeMeal, setActiveMeal] = React.useState(initialMealIdx);
  const [refreshKey, setRefreshKey] = React.useState(0); // Key để force re-render RecipeCard
  const [mealsFromAPI, setMealsFromAPI] = React.useState([]); // Meals từ API
  const [loadingMeals, setLoadingMeals] = React.useState(false); // Loading state
  
  // State để lưu date và mealType khi chọn từ tab "Thực đơn"
  const [selectedDateFromWeeklyPlan, setSelectedDateFromWeeklyPlan] = React.useState(null);
  const [selectedMealTypeFromWeeklyPlan, setSelectedMealTypeFromWeeklyPlan] = React.useState(null);

  // Nếu được mở từ HomeScreen để chọn món cho 1 buổi, nhận date & mealType
  const params = route?.params || {};
  const selectedDateFromHome = params.date ? new Date(params.date) : null;
  const mealTypeFromHome = params.mealType || null;
  const mealsOfSelectedDate = React.useMemo(() => {
    if (!selectedDateFromHome) return {};
    return getMealsForDate(selectedDateFromHome);
  }, [getMealsForDate, selectedDateFromHome]);

  // Khi mealType từ route thay đổi thì sync tab con
  React.useEffect(() => {
    if (!mealTypeFromHome) return;
    if (mealTypeFromHome === 'breakfast') setActiveMeal(0);
    else if (mealTypeFromHome === 'lunch') setActiveMeal(1);
    else if (mealTypeFromHome === 'dinner') setActiveMeal(2);
  }, [mealTypeFromHome]);

  // Map từ activeMeal index sang mealTime string
  const mealTimeMap = {
    0: 'breakfast', // Sáng
    1: 'lunch',     // Trưa
    2: 'dinner',    // Tối
  };

  // Refresh premium status khi quay lại RecipeScreen
  useFocusEffect(
    React.useCallback(() => {
      refreshPremiumStatus();
    }, [refreshPremiumStatus])
  );

  // Load meals từ API
  const loadMealsFromAPI = React.useCallback(async () => {
    if (!premiumActive) return;
    
    setLoadingMeals(true);
    try {
      let allMeals = [];
      let currentPage = 1;
      const limit = 50;
      let hasMore = true;
      
      // Lấy tất cả meals với pagination
      while (hasMore && allMeals.length < 200) {
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
      
      setMealsFromAPI(allMeals);
    } catch (error) {
      console.error('Error loading meals from API:', error);
      setMealsFromAPI([]);
    } finally {
      setLoadingMeals(false);
    }
  }, [premiumActive]);

  // Load meals khi chuyển sang tab "Thực đơn" và user là premium
  React.useEffect(() => {
    if (activeTab === 1 && premiumActive && mealsFromAPI.length === 0) {
      loadMealsFromAPI();
    }
  }, [activeTab, premiumActive, loadMealsFromAPI, mealsFromAPI.length]);

  // Load saved meals từ context
  const savedMeals = React.useMemo(() => {
    return getSavedMealsByTime(activeMeal);
  }, [activeMeal, getSavedMealsByTime]);

  // Tính toán tuần hiện tại (từ thứ 2 đến chủ nhật) - chỉ dùng cho tab "Thực đơn"
  const today = React.useMemo(() => new Date(), []);
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
  }, [today]);

  // Danh sách hiển thị: tab "Mới nhất" hiển thị saved meals hoặc meals từ API (khi chọn từ weekly plan), tab "Thực đơn" hiển thị meals theo tuần
  let list = React.useMemo(() => {
    if (activeTab === 0) {
      // Tab "Mới nhất" - hiển thị saved meals hoặc meals từ API (khi chọn từ weekly plan)
      if (selectedDateFromWeeklyPlan && selectedMealTypeFromWeeklyPlan) {
        // Nếu đang chọn từ weekly plan, hiển thị meals từ API
        const currentMealTime = mealTimeMap[activeMeal];
        if (!currentMealTime) return [];
        
        // Filter meals có mealTime tương ứng với buổi đang chọn
        return mealsFromAPI.filter(meal => {
          const mealTimes = meal.mealTime || [];
          return mealTimes.includes(currentMealTime);
        });
      } else {
        // Hiển thị saved meals
        return savedMeals;
      }
    } else {
      // Tab "Thực đơn" - không dùng list nữa, sẽ hiển thị theo tuần
      return [];
    }
  }, [activeTab, activeMeal, savedMeals, selectedDateFromWeeklyPlan, selectedMealTypeFromWeeklyPlan, mealsFromAPI, mealTimeMap]);

  // Nếu đang chọn từ Home hoặc từ weekly plan và buổi đó đã có món, ẩn món đó khỏi danh sách để tránh trùng lặp
  // Luôn ẩn món đang được gán cho buổi hiện tại (dù mở từ Home hay mở trực tiếp)
  // Chỉ áp dụng cho tab "Mới nhất"
  const targetDateForFilter = selectedDateFromHome || selectedDateFromWeeklyPlan || new Date();
  const currentMealType =
    mealTypeFromHome ||
    selectedMealTypeFromWeeklyPlan ||
    (activeMeal === 0 ? 'breakfast' : activeMeal === 1 ? 'lunch' : 'dinner');
  const assignedForCurrent = getMealsForDate(targetDateForFilter)?.[currentMealType];
  const assignedMealId = assignedForCurrent?.id || null;
  if (assignedMealId && activeTab === 0) {
    list = list.filter(m => m.id !== assignedMealId);
  }

  // Hàm xử lý khi chọn meal cho một bữa trong tuần (tab "Thực đơn")
  const handleSelectMealForWeek = React.useCallback((date, mealTime) => {
    // Lưu date và mealType vào state
    setSelectedDateFromWeeklyPlan(date);
    setSelectedMealTypeFromWeeklyPlan(mealTime);
    
    // Set activeMeal theo mealTime
    if (mealTime === 'breakfast') setActiveMeal(0);
    else if (mealTime === 'lunch') setActiveMeal(1);
    else if (mealTime === 'dinner') setActiveMeal(2);
    
    // Load meals từ API nếu chưa có
    if (mealsFromAPI.length === 0 && premiumActive) {
      loadMealsFromAPI();
    }
    
    // Chuyển sang tab "Mới nhất" để hiển thị danh sách meals
    setActiveTab(0);
  }, [premiumActive, mealsFromAPI.length, loadMealsFromAPI]);

  // Hàm xử lý khi bấm vào meal trong tab "Thực đơn"
  const handleMealPressInWeeklyPlan = React.useCallback((date, mealTime, selectedMeal) => {
    if (selectedMeal) {
      // Nếu đã có meal, tìm meal đầy đủ từ mealsFromAPI hoặc dùng meal từ MealsContext
      const fullMeal = mealsFromAPI.find(m => m.id === selectedMeal.id) || selectedMeal;
      
      // Navigate đến MealDetails
      navigation.navigate('MealDetails', { 
        mealId: fullMeal.id, 
        meal: fullMeal 
      });
    } else {
      // Nếu chưa có meal, chọn meal mới
      handleSelectMealForWeek(date, mealTime);
    }
  }, [mealsFromAPI, navigation, handleSelectMealForWeek]);

  // Xử lý khi bấm bookmark (toggle save/unsave)
  const handleBookmarkPress = React.useCallback(async (meal) => {
    try {
      // Xác định buổi ăn từ mealTime trong database
      // Nếu meal không có mealTime hoặc không xác định được, dùng buổi hiện tại đang chọn
      const mealTimeFromDB = determineMealTime(meal);
      const mealTimeIndex = mealTimeFromDB !== null ? mealTimeFromDB : activeMeal;
      await saveMeal(meal, mealTimeIndex);
      
      // Force refresh bằng cách tăng refreshKey để trigger re-render RecipeCard
      // Điều này đảm bảo UI cập nhật ngay lập tức sau khi lưu/xóa
      setRefreshKey(prev => prev + 1);
      
      // Không hiển thị thông báo để tránh spam, UI sẽ tự động cập nhật icon bookmark
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Lỗi', 'Không thể lưu/hủy lưu món ăn');
    }
  }, [saveMeal, determineMealTime, activeMeal]);

  // Thêm vào Home (nhật ký bữa ăn) cho date + mealType được truyền từ HomeScreen hoặc từ weekly plan
  const handleAddToHome = React.useCallback((meal) => {
    try {
      // Nếu mở từ Home: dùng date & mealType từ route
      // Nếu mở từ weekly plan: dùng date & mealType từ state
      const targetDate = selectedDateFromHome || selectedDateFromWeeklyPlan || new Date();
      const mealType =
        mealTypeFromHome ||
        selectedMealTypeFromWeeklyPlan ||
        (activeMeal === 0 ? 'breakfast' : activeMeal === 1 ? 'lunch' : 'dinner');

      setMealForDate(targetDate, mealType, {
        id: meal.id,
        title: meal.title,
        desc: meal.desc,
        time: meal.time,
        totalKcal: meal.totalKcal,
        mealTime: meal.mealTime,
        image: meal.image,
      });

      // Nếu chọn từ weekly plan, quay lại tab "Thực đơn" để xem kết quả
      if (selectedDateFromWeeklyPlan) {
        setSelectedDateFromWeeklyPlan(null);
        setSelectedMealTypeFromWeeklyPlan(null);
        setActiveTab(1); // Chuyển về tab "Thực đơn"
      } else {
        // Sau khi thêm, điều hướng về Home để xem kết quả
        navigation.navigate('Home');
      }
    } catch (e) {
      console.error('Error setMealForDate:', e);
    }
  }, [selectedDateFromHome, selectedDateFromWeeklyPlan, mealTypeFromHome, selectedMealTypeFromWeeklyPlan, activeMeal, setMealForDate, navigation]);

  const handleRemoveFromHome = React.useCallback(() => {
    if (!selectedDateFromHome || !mealTypeFromHome) return;
    try {
      clearMealForDate(selectedDateFromHome, mealTypeFromHome);
      navigation.navigate('Home');
    } catch (e) {
      console.error('Error clearMealForDate:', e);
    }
  }, [selectedDateFromHome, mealTypeFromHome, clearMealForDate, navigation]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FixedHeader onPressPremium={premiumActive ? undefined : () => navigation.navigate('Premium')} />
      <View style={styles.body}>
        <View style={styles.softDivider} />
        {/* Search Bar */}
        <TouchableOpacity 
          style={styles.searchWrap}
          onPress={() => navigation.navigate('SearchRecipe')}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color="#9F9A94" style={{ marginLeft: 10, marginRight: 6 }} />
          <Text style={styles.searchPlaceholder}>Nhập nguyên liệu</Text>
        </TouchableOpacity>
        {/* Top Tabs */}
        <View style={styles.tabRow}>
          {TOP_TABS.map((lbl, i) => (
            <TouchableOpacity
              key={lbl}
              style={styles.tabBtn}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.81}
            >
              <Text style={[styles.tabLabel, activeTab === i && styles.tabLabelActive]}>{lbl}</Text>
              {activeTab === i && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 0 ? (
          <>
            {/* Sub meal tab (Sáng/Trưa/Tối) */}
            <View style={styles.mealTabRow}>
              {MEAL_TABS.map((lbl, i) => (
                <TouchableOpacity
                  key={lbl}
                  style={[styles.mealTabBtn, activeMeal === i && styles.mealTabBtnActive]}
                  onPress={() => setActiveMeal(i)}
                  activeOpacity={0.78}>
                  <Text style={[styles.mealTabLabel, activeMeal === i && styles.mealTabLabelActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recipe list */}
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 120 }}>
              {loadingMeals && selectedDateFromWeeklyPlan && selectedMealTypeFromWeeklyPlan ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#FAE2AF" />
                  <Text style={{ marginTop: 12, color: '#7D6E62' }}>Đang tải công thức...</Text>
                </View>
              ) : list.length === 0 ? (
                <Text style={styles.emptyRecipe}>
                  {selectedDateFromWeeklyPlan && selectedMealTypeFromWeeklyPlan 
                    ? 'Chưa có công thức cho buổi này' 
                    : activeTab === 0 
                    ? 'Chưa có món ăn đã lưu' 
                    : 'Chưa có công thức'}
                </Text>
              ) : (
                list.map((meal, idx) => (
                  <RecipeCard 
                    key={`${meal.id || idx}-${refreshKey}`} 
                    meal={meal} 
                    mealTimeIndex={activeMeal}
                    onBookmarkPress={handleBookmarkPress}
                    onAddPress={handleAddToHome}
                    onRemovePress={handleRemoveFromHome}
                    selectionMode={(!!selectedDateFromHome && !!mealTypeFromHome) || (!!selectedDateFromWeeklyPlan && !!selectedMealTypeFromWeeklyPlan)}
                    isSelected={
                      (!!selectedDateFromHome && !!mealTypeFromHome && mealsOfSelectedDate?.[mealTypeFromHome]?.id === meal.id) ||
                      (!!selectedDateFromWeeklyPlan && !!selectedMealTypeFromWeeklyPlan && getMealsForDate(selectedDateFromWeeklyPlan)?.[selectedMealTypeFromWeeklyPlan]?.id === meal.id)
                    }
                  />
                ))
              )}
            </ScrollView>
          </>
        ) : premiumActive ? (
          <>
            {/* Tab "Thực đơn" - hiển thị meals theo tuần với UI giống WeeklyMealPlanScreen */}
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {weekDates.map((date, dayIdx) => {
                const dateStr = date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
                const isToday = date.toDateString() === today.toDateString();
                const mealsForDate = getMealsForDate(date);
                
                return (
                  <View key={dayIdx} style={styles.weeklyDayCard}>
                    <View style={styles.weeklyDayHeader}>
                      <Text style={styles.weeklyDayLabel}>{WEEK_LABELS[dayIdx]}</Text>
                      <Text style={[styles.weeklyDayDate, isToday && styles.weeklyDayDateToday]}>{dateStr}</Text>
                    </View>
                    
                    {MEAL_TIMES.map((mealTime, mealIdx) => {
                      const selectedMeal = mealsForDate?.[mealTime];
                      
                      return (
                        <View key={mealIdx} style={[styles.weeklyMealRow, mealIdx === MEAL_TIMES.length - 1 && styles.weeklyMealRowLast]}>
                          <View style={styles.weeklyMealInfo}>
                            <Text style={styles.weeklyMealLabel}>{MEAL_TABS[mealIdx]}</Text>
                            {selectedMeal?.totalKcal && (
                              <Text style={styles.weeklyMealCal}>{selectedMeal.totalKcal} Cal</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[styles.weeklyMealButton, selectedMeal && styles.weeklyMealButtonSelected]}
                            onPress={() => handleMealPressInWeeklyPlan(date, mealTime, selectedMeal)}
                            activeOpacity={0.8}
                          >
                            {selectedMeal ? (
                              <View style={styles.weeklySelectedMeal}>
                                <Text style={styles.weeklySelectedMealTitle} numberOfLines={1}>
                                  {selectedMeal.title}
                                </Text>
                                {selectedMeal.desc && (
                                  <Text style={styles.weeklySelectedMealDesc} numberOfLines={1}>
                                    {selectedMeal.desc}
                                  </Text>
                                )}
                              </View>
                            ) : (
                              <Text style={styles.weeklyMealButtonText}>Chọn món</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name="crown" size={72} color="#A9A29C" style={{ marginBottom: 24 }} />
            <Text style={styles.lockTitle}>Mở gói cao cấp để sử dụng tính năng này</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: '#F6F6FA' },
  softDivider: { height: 1, backgroundColor: '#EEE9E2', marginHorizontal: 16, opacity: 0.7 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10, marginHorizontal: 20,
    backgroundColor: '#F0EEEC', borderRadius: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  input: { flex: 1, fontSize: 16, color: '#3C2C21', marginLeft: 6, paddingVertical: 4 },
  searchPlaceholder: { flex: 1, fontSize: 16, color: '#B7B2AE', marginLeft: 6, paddingVertical: 4 },
  tabRow: {
    marginTop: 10, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20,
    borderBottomColor: '#F1E8DA', borderBottomWidth: 1, minHeight: 46,
  },
  tabBtn: { paddingBottom: 9 },
  tabLabel: { fontSize: 18, color: '#826F60', fontWeight: '900' },
  tabLabelActive: { color: '#3C2C21' },
  tabUnderline: { marginTop: 6, height: 4, backgroundColor: '#F3DEAA', borderRadius: 3, width: 70, alignSelf: 'center' },
  mealTabRow: { marginTop: 12, flexDirection: 'row', gap: 16, justifyContent: 'center' },
  mealTabBtn: { borderRadius: 28, backgroundColor: '#EEE6D8', paddingHorizontal: 20, paddingVertical: 9 },
  mealTabBtnActive: { backgroundColor: '#FAE2AF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  mealTabLabel: { fontSize: 15, color: '#94826C', fontWeight: '700' },
  mealTabLabelActive: { color: '#3C2C21', fontWeight: '900' },
  emptyRecipe: { color: '#B6ADA7', fontWeight: '800', fontSize: 24, textAlign: 'center', marginTop: 40 },
  // Recipe cards
  recipeShadow: { borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: 12 },
  recipeCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
  recipeRight: { width: 110, backgroundColor: '#EFD493' },
  recipeTitle: { color: '#3C2C21', fontWeight: '900', fontSize: 18, lineHeight: 22 },
  recipeDesc: { color: '#8E7F73', marginTop: 6 },
  recipeTime: { color: '#9A8A7B', marginTop: 10, fontWeight: '800' },
  lockTitle: { color: '#9A9390', fontWeight: '900', fontSize: 22, textAlign: 'center', paddingHorizontal: 28, lineHeight: 30, maxWidth: 360 },
  // Weekly meal plan styles (giống WeeklyMealPlanScreen)
  weeklyDayCard: { backgroundColor: '#FFFFFF', margin: 16, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  weeklyDayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0ECE7' },
  weeklyDayLabel: { fontSize: 18, fontWeight: '900', color: '#3C2C21', marginRight: 12 },
  weeklyDayDate: { fontSize: 16, color: '#7D6E62', fontWeight: '700' },
  weeklyDayDateToday: { color: '#F2C763', fontWeight: '900' },
  weeklyMealRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F8F6F3' },
  weeklyMealRowLast: { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 },
  weeklyMealInfo: { flex: 1 },
  weeklyMealLabel: { fontSize: 16, fontWeight: '800', color: '#3C2C21', marginBottom: 4 },
  weeklyMealCal: { fontSize: 14, color: '#7D6E62', fontWeight: '700' },
  weeklyMealButton: { backgroundColor: '#F8F6F3', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, minWidth: 120, alignItems: 'center', borderWidth: 1, borderColor: '#E6E0DA' },
  weeklyMealButtonSelected: { backgroundColor: '#FAE2AF', borderColor: '#F2C763' },
  weeklyMealButtonText: { color: '#3C2C21', fontWeight: '800', fontSize: 14 },
  weeklySelectedMeal: { alignItems: 'center', maxWidth: 140 },
  weeklySelectedMealTitle: { color: '#3C2C21', fontWeight: '900', fontSize: 14, textAlign: 'center', marginBottom: 2 },
  weeklySelectedMealDesc: { color: '#7D6E62', fontSize: 11, textAlign: 'center' },
});
