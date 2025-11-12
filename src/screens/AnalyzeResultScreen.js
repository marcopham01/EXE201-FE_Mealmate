import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSavedMeals } from '../context/SavedMealsContext';

const MEAL_TYPES = ['Sáng', 'Trưa', 'Tối'];

// Mapping từ mealTime của backend sang MEAL_TYPES
const MEAL_TIME_MAP = {
  breakfast: 'Sáng',
  lunch: 'Trưa',
  dinner: 'Tối',
};

const { width } = Dimensions.get('window');

export default function AnalyzeResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { saveMeal, isMealSaved, determineMealTime } = useSavedMeals();
  const { 
    ingredientsDetected = [], // Tên nguyên liệu thô từ Gemini
    matchedIngredients = [], // Ingredient objects đã match trong DB
    meals: mealsFromAPI = [], // Danh sách món ăn từ API
    apiNote = null, // Note từ API
    rawResult 
  } = route.params || {};
  
  // State để force re-render khi bookmark thay đổi
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Kết hợp ingredientsDetected và matchedIngredients để hiển thị
  // Ưu tiên hiển thị matchedIngredients (có thông tin đầy đủ hơn)
  const allIngredients = useMemo(() => {
    const matched = matchedIngredients.map(ing => ({
      name: ing.name || '',
      isMatched: true, // Đã match trong DB
    }));
    
    // Thêm ingredientsDetected chưa match
    const detectedSet = new Set(matchedIngredients.map(ing => 
      (ing.name || '').toLowerCase().trim()
    ));
    const unmatched = ingredientsDetected
      .filter(name => {
        const normalized = (name || '').toLowerCase().trim();
        return normalized && !detectedSet.has(normalized);
      })
      .map(name => ({
        name: name || '',
        isMatched: false, // Chưa match trong DB
      }));
    
    return [...matched, ...unmatched];
  }, [ingredientsDetected, matchedIngredients]);
  
  // Xác định mealType mặc định dựa trên dữ liệu
  const getDefaultMealType = () => {
    if (mealsFromAPI && mealsFromAPI.length > 0) {
      // Tìm mealType có nhiều món nhất
      const mealTypeCounts = { 'Sáng': 0, 'Trưa': 0, 'Tối': 0 };
      mealsFromAPI.forEach(meal => {
        const mealTimes = meal.mealTime || [];
        mealTimes.forEach(mt => {
          const mappedType = MEAL_TIME_MAP[mt];
          if (mappedType && mealTypeCounts[mappedType] !== undefined) {
            mealTypeCounts[mappedType]++;
          }
        });
      });
      const maxType = Object.keys(mealTypeCounts).reduce((a, b) => 
        mealTypeCounts[a] > mealTypeCounts[b] ? a : b
      );
      return maxType;
    }
    return 'Trưa'; // Default
  };

  const [activeMealType, setActiveMealType] = useState(getDefaultMealType());

  // Filter và transform meals theo activeMealType
  // Logic: Mỗi món chỉ xuất hiện ở một tab duy nhất (ưu tiên: Sáng > Trưa > Tối)
  // Để tránh trùng lặp khi một món có mealTime = ["breakfast", "lunch"]
  const meals = useMemo(() => {
    if (!mealsFromAPI || mealsFromAPI.length === 0) {
      return [];
    }

    // Map mealTime từ backend sang MEAL_TYPES và xác định tab ưu tiên cho mỗi món
    const mealTimePriority = { 'Sáng': 0, 'Trưa': 1, 'Tối': 2 };
    
    const filtered = mealsFromAPI
      .filter(meal => {
        const mealTimes = meal.mealTime || [];
        if (mealTimes.length === 0) return false;
        
        // Xác định tab ưu tiên nhất cho món này (ưu tiên: breakfast > lunch > dinner)
        const mappedTypes = mealTimes
          .map(mt => MEAL_TIME_MAP[mt])
          .filter(Boolean)
          .sort((a, b) => (mealTimePriority[a] || 999) - (mealTimePriority[b] || 999));
        
        // Chỉ hiển thị món này ở tab ưu tiên nhất của nó
        return mappedTypes.length > 0 && mappedTypes[0] === activeMealType;
      })
      .map(meal => {
        // Transform meal từ backend format sang format hiển thị
        // Backend trả về: { name, image, totalKcal, dietType, mealTime, ingredients (populated), ... }
        const ingredientNames = (meal.ingredients || []).map(ing => {
          if (typeof ing === 'string') return ing;
          return ing?.name || '';
        }).filter(Boolean).join(', ');

        // Ước tính thời gian nấu (có thể dựa vào số lượng ingredients hoặc category)
        const estimatedTime = meal.estimatedTime || 
          (meal.ingredients?.length ? `${Math.max(10, meal.ingredients.length * 3)} phút` : '15 phút');

        return {
          id: meal._id || meal.id || Math.random().toString(),
          name: meal.name || 'Món ăn',
          ingredients: ingredientNames || '',
          time: estimatedTime,
          totalKcal: meal.totalKcal || null,
          dietType: meal.dietType || null,
          image: meal.image || null,
          category: meal.category?.name || null,
          subCategory: meal.subCategory?.name || null,
          mealTime: meal.mealTime || [],
        };
      });

    return filtered;
  }, [mealsFromAPI, activeMealType]);

  // Xử lý khi bấm bookmark (toggle save/unsave)
  const handleBookmarkPress = useCallback(async (meal, mealType) => {
    try {
      // Transform meal sang format phù hợp với SavedMealsContext
      // Format cần: { id, title, desc, time, totalKcal, mealTime, image, ... }
      const transformedMeal = {
        id: meal.id,
        title: meal.name, // Transform name -> title
        desc: meal.ingredients, // ingredients đã là string rồi
        time: meal.time,
        totalKcal: meal.totalKcal || null,
        mealTime: meal.mealTime || [],
        image: meal.image || null,
        category: meal.category || null,
        subCategory: meal.subCategory || null,
      };
      
      // Xác định buổi ăn từ mealTime trong database
      // Nếu meal không có mealTime hoặc không xác định được, dùng mealType từ section
      const mealTimeFromDB = determineMealTime(transformedMeal);
      const mealTimeIndex = mealTimeFromDB !== null ? mealTimeFromDB : 
        (mealType === 'Sáng' ? 0 : mealType === 'Trưa' ? 1 : 2);
      
      await saveMeal(transformedMeal, mealTimeIndex);
      
      // Force refresh để cập nhật UI
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  }, [saveMeal, determineMealTime]);

  // Xử lý khi xác nhận - navigate đến RecipeScreen tab "Mới nhất" để xem các món đã lưu
  const handleConfirm = useCallback(() => {
    // Các món đã được lưu khi user bấm bookmark, chỉ cần navigate đến RecipeScreen
    // Navigate đến Main (BottomTabs) với screen Recipes và params
    navigation.navigate('Main', {
      screen: 'Recipes',
      params: {
        initialTab: 0, // Tab "Mới nhất"
      },
    });
  }, [navigation]);

  const handleRetry = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3C2C21" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kết quả phân tích</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 120 }}>
        {/* Hiển thị note từ API nếu có */}
        {apiNote && (
          <View style={styles.noteContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#F2C763" />
            <Text style={styles.noteText}>{apiNote}</Text>
          </View>
        )}

        {/* Hiển thị danh sách nguyên liệu đã nhận diện */}
        {allIngredients && allIngredients.length > 0 && (
          <View style={styles.ingredientsSection}>
            <Text style={styles.sectionTitle}>Nguyên liệu đã nhận diện</Text>
            <View style={styles.ingredientsContainer}>
              {allIngredients.map((ingredient, index) => {
                const ingName = ingredient.name || '';
                const isMatched = ingredient.isMatched;
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.ingredientChip,
                      isMatched ? styles.ingredientChipMatched : styles.ingredientChipUnmatched
                    ]}
                  >
                    <Text style={styles.ingredientText}>{ingName}</Text>
                    {isMatched && (
                      <Ionicons name="checkmark-circle" size={18} color="#3C2C21" style={{ marginLeft: 4 }} />
                    )}
                  </View>
                );
              })}
            </View>
            {matchedIngredients.length > 0 && (
              <Text style={styles.ingredientsHint}>
                {matchedIngredients.length} nguyên liệu đã khớp với cơ sở dữ liệu
              </Text>
            )}
          </View>
        )}

        {/* Hiển thị gợi ý món ăn */}
        {mealsFromAPI && mealsFromAPI.length > 0 && (
          <>
            <View style={styles.mealTypeSelector}>
              {MEAL_TYPES.map((type) => {
                // Đếm số món cho mỗi loại - dùng logic ưu tiên giống filter
                const mealTimePriority = { 'Sáng': 0, 'Trưa': 1, 'Tối': 2 };
                const count = mealsFromAPI.filter(meal => {
                  const mealTimes = meal.mealTime || [];
                  if (mealTimes.length === 0) return false;
                  
                  // Xác định tab ưu tiên nhất cho món này
                  const mappedTypes = mealTimes
                    .map(mt => MEAL_TIME_MAP[mt])
                    .filter(Boolean)
                    .sort((a, b) => (mealTimePriority[a] || 999) - (mealTimePriority[b] || 999));
                  
                  // Chỉ đếm nếu tab này là tab ưu tiên nhất của món
                  return mappedTypes.length > 0 && mappedTypes[0] === type;
                }).length;
                
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.mealTypeButton, activeMealType === type && styles.activeMealTypeButton]}
                    onPress={() => setActiveMealType(type)}
                  >
                    <Text style={[styles.mealTypeText, activeMealType === type && styles.activeMealTypeText]}>
                      {type} {count > 0 && `(${count})`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {meals.length > 0 ? (
              meals.map((item) => {
                // Xác định mealTimeIndex để check saved status
                const mealTimeFromDB = determineMealTime(item);
                const mealTimeIndex = mealTimeFromDB !== null ? mealTimeFromDB : 
                  (activeMealType === 'Sáng' ? 0 : activeMealType === 'Trưa' ? 1 : 2);
                const isSaved = isMealSaved(item.id, mealTimeIndex);
                
                return (
                  <TouchableOpacity 
                    key={`${item.id}-${refreshKey}`} 
                    activeOpacity={0.88} 
                    style={styles.recipeShadow}
                  >
                    <View style={styles.recipeCard}>
                      <View style={{ flex: 1, padding: 14 }}>
                        <Text style={styles.recipeTitle}>{item.name}</Text>
                        <Text style={styles.recipeDesc}>{item.ingredients}</Text>
                        <View style={styles.recipeMeta}>
                          <Text style={styles.recipeTime}>Thời gian: {item.time}</Text>
                          {item.totalKcal && (
                            <View style={styles.caloriesBadge}>
                              <Text style={styles.caloriesText}>{item.totalKcal} kcal</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.recipeRight}>
                        <TouchableOpacity
                          onPress={() => handleBookmarkPress(item, activeMealType)}
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
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="restaurant-outline" size={48} color="#BEB9B4" />
                <Text style={styles.emptyStateText}>Không có món ăn nào cho {activeMealType.toLowerCase()}</Text>
              </View>
            )}
          </>
        )}

        {/* Trạng thái không có dữ liệu */}
        {(!allIngredients || allIngredients.length === 0) && (!mealsFromAPI || mealsFromAPI.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={48} color="#BEB9B4" />
            <Text style={styles.emptyStateText}>Không tìm thấy nguyên liệu hoặc món ăn</Text>
            <Text style={styles.emptyStateSubtext}>Vui lòng thử lại với ảnh khác</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleRetry}>
          <Text style={styles.secondaryButtonText}>Làm lại</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleConfirm}>
          <Text style={styles.primaryButtonText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2D2D2D',
    marginLeft: 12,
  },
  // Styles from RecipeScreen
  recipeShadow: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    marginBottom: 12,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  recipeRight: {
    width: 110,
    backgroundColor: '#EFD493',
  },
  recipeTitle: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 22,
  },
  recipeDesc: {
    color: '#8E7F73',
    marginTop: 6,
  },
  recipeTime: {
    color: '#9A8A7B',
    marginTop: 10,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E7E6',
    backgroundColor: '#F6F6FA',
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFD37A',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5C3A2B',
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
  },
  secondaryButtonText: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
  },
  ingredientsSection: {
    marginBottom: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3C2C21',
    marginBottom: 12,
  },
  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientChip: {
    backgroundColor: '#FAE2AF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8C88F',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ingredientText: {
    color: '#3C2C21',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#9C8F86',
    fontWeight: '800',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#BEB9B4',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  noteText: {
    flex: 1,
    color: '#7D6E62',
    fontWeight: '700',
    fontSize: 14,
  },
  ingredientChipMatched: {
    backgroundColor: '#FAE2AF',
    borderColor: '#E8C88F',
  },
  ingredientChipUnmatched: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.8,
  },
  ingredientsHint: {
    marginTop: 8,
    color: '#9C8F86',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
    flexWrap: 'wrap',
  },
  caloriesBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  caloriesText: {
    color: '#7D6E62',
    fontWeight: '800',
    fontSize: 12,
  },
  mealTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 16,
  },
  mealTypeButton: {
    borderRadius: 28,
    backgroundColor: '#EEE6D8',
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  activeMealTypeButton: {
    backgroundColor: '#FAE2AF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  mealTypeText: {
    fontSize: 15,
    color: '#94826C',
    fontWeight: '700',
  },
  activeMealTypeText: {
    color: '#3C2C21',
    fontWeight: '900',
  },
});


