import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import FixedHeader from '../components/FixedHeader';
import { usePremium } from '../context/PremiumContext';
import { useSavedMeals } from '../context/SavedMealsContext';
import { getAllMeals } from '../api/meals';

const TOP_TABS = ['Mới nhất', 'Thực đơn'];
const MEAL_TABS = ['Sáng', 'Trưa', 'Tối'];

function RecipeCard({ meal, mealTimeIndex, onBookmarkPress }) {
  const { isMealSaved } = useSavedMeals();
  const isSaved = isMealSaved(meal.id, mealTimeIndex);

  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.recipeShadow}>
      <View style={styles.recipeCard}> 
        <View style={{ flex: 1, padding: 14 }}>
          <Text style={styles.recipeTitle}>{meal.title}</Text>
          <Text style={styles.recipeDesc}>{meal.desc}</Text>
          <Text style={styles.recipeTime}>Thời gian: {meal.time}</Text>
        </View>
        <View style={styles.recipeRight}>
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
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RecipeScreen() {
  const navigation = useNavigation();
  const { premiumActive, refreshPremiumStatus } = usePremium();
  const { saveMeal, getSavedMealsByTime, determineMealTime } = useSavedMeals();
  const [activeTab, setActiveTab] = React.useState(0);
  const [activeMeal, setActiveMeal] = React.useState(0);
  const [refreshKey, setRefreshKey] = React.useState(0); // Key để force re-render RecipeCard
  const [mealsFromAPI, setMealsFromAPI] = React.useState([]); // Meals từ API
  const [loadingMeals, setLoadingMeals] = React.useState(false); // Loading state

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

  // Danh sách hiển thị: tab "Mới nhất" hiển thị saved meals, tab "Thực đơn" hiển thị meals từ API
  const list = React.useMemo(() => {
    if (activeTab === 0) {
      // Tab "Mới nhất" - hiển thị saved meals
      return savedMeals;
    } else {
      // Tab "Thực đơn" - lấy meals từ API và filter theo mealTime
      const currentMealTime = mealTimeMap[activeMeal];
      if (!currentMealTime) return [];
      
      // Filter meals có mealTime tương ứng với buổi đang chọn
      return mealsFromAPI.filter(meal => {
        const mealTimes = meal.mealTime || [];
        return mealTimes.includes(currentMealTime);
      });
    }
  }, [activeTab, activeMeal, savedMeals, mealsFromAPI]);

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
              {list.length === 0 ? (
                <Text style={styles.emptyRecipe}>
                  {activeTab === 0 ? 'Chưa có món ăn đã lưu' : 'Chưa có công thức'}
                </Text>
              ) : (
                list.map((meal, idx) => (
                  <RecipeCard 
                    key={`${meal.id || idx}-${refreshKey}`} 
                    meal={meal} 
                    mealTimeIndex={activeMeal}
                    onBookmarkPress={handleBookmarkPress}
                  />
                ))
              )}
            </ScrollView>
          </>
        ) : premiumActive ? (
          <>
            {/* Sub meal tab (Sáng/Trưa/Tối) cho tab Thực đơn */}
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

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 }}>
              {loadingMeals ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator size="large" color="#FAE2AF" />
                  <Text style={{ marginTop: 12, color: '#7D6E62' }}>Đang tải công thức...</Text>
                </View>
              ) : list.length === 0 ? (
                <Text style={styles.emptyRecipe}>Chưa có công thức cho buổi {MEAL_TABS[activeMeal]}</Text>
              ) : (
                list.map((meal, idx) => (
                  <RecipeCard 
                    key={`${meal.id || idx}-${refreshKey}`} 
                    meal={meal} 
                    mealTimeIndex={activeMeal}
                    onBookmarkPress={handleBookmarkPress}
                  />
                ))
              )}
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
});
