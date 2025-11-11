import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { searchMeals } from '../api/meals';
import { useSavedMeals } from '../context/SavedMealsContext';

// Danh sách tag nguyên liệu phổ biến (theo thứ tự hiển thị trong ảnh)
const POPULAR_INGREDIENTS = [
  'Thịt heo',
  'Thịt bò',
  'Thịt gà',
  'Cá lóc',
  'Tôm',
  'Mực',
  'Sườn heo',
  'Trứng gà',
  'Trứng vịt',
  'Đậu hũ',
];

// Component hiển thị một meal card
function MealCard({ meal, onPress, onBookmarkPress }) {
  const { isMealSaved, determineMealTime } = useSavedMeals();
  // Kiểm tra xem meal đã được lưu chưa (check tất cả các buổi)
  const mealTimeIndex = determineMealTime(meal);
  const isSaved = isMealSaved(meal.id, mealTimeIndex);

  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.mealCardShadow} onPress={onPress}>
      <View style={styles.mealCard}>
        <View style={{ flex: 1, padding: 14 }}>
          <Text style={styles.mealTitle}>{meal.title}</Text>
          <Text style={styles.mealDesc}>{meal.desc}</Text>
          <Text style={styles.mealTime}>Thời gian: {meal.time}</Text>
        </View>
        <View style={styles.mealCardRight}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation(); // Ngăn không cho trigger onPress của card
              onBookmarkPress && onBookmarkPress(meal);
            }}
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

export default function SearchRecipeScreen() {
  const navigation = useNavigation();
  const { saveMeal, determineMealTime } = useSavedMeals();
  const [searchText, setSearchText] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Key để force re-render MealCard
  const searchTimeoutRef = useRef(null); // Ref cho debounce timeout

  // Hàm toggle chọn/bỏ chọn tag nguyên liệu
  const toggleIngredient = (ingredient) => {
    setSelectedIngredients(prev => {
      if (prev.includes(ingredient)) {
        return prev.filter(ing => ing !== ingredient);
      } else {
        return [...prev, ingredient];
      }
    });
  };

  // Hàm tìm kiếm meals từ database
  const performSearch = React.useCallback(async (text, ingredients) => {
    setIsSearching(true);
    try {
      const results = await searchMeals({
        searchText: text.trim(),
        ingredients: ingredients,
      });
      // Đảm bảo results là array
      if (Array.isArray(results)) {
        setSearchResults(results);
      } else {
        console.warn('Search results is not an array:', results);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Hiển thị lỗi cho user nếu cần
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Tìm kiếm real-time khi nhập từng chữ (với debounce)
  React.useEffect(() => {
    // Xóa timeout trước đó nếu có
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Nếu không có searchText và không có ingredients, không search
    if (!searchText.trim() && selectedIngredients.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Set timeout để debounce (đợi 500ms sau khi user ngừng nhập)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchText, selectedIngredients);
    }, 500); // Debounce 500ms

    // Cleanup timeout khi component unmount hoặc dependencies thay đổi
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, selectedIngredients, performSearch]);

  // Hàm xử lý khi bấm nút Xác nhận (tìm kiếm ngay lập tức và quay lại RecipeScreen)
  const handleConfirmSearch = async () => {
    // Xóa timeout nếu có
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Search ngay lập tức
    await performSearch(searchText, selectedIngredients);
    // Quay lại RecipeScreen sau khi search
    navigation.goBack();
  };

  // Hàm reset tìm kiếm
  const handleReset = () => {
    // Xóa timeout nếu có
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchText('');
    setSelectedIngredients([]);
    setSearchResults([]);
    setIsSearching(false);
  };

  // Xử lý khi bấm bookmark trong kết quả tìm kiếm (toggle save/unsave)
  const handleBookmarkPress = async (meal) => {
    try {
      // Xác định buổi ăn từ mealTime trong database
      // Nếu meal không có mealTime, mặc định là lunch (1)
      const mealTimeIndex = determineMealTime(meal) ?? 1;
      const wasAdded = await saveMeal(meal, mealTimeIndex);
      
      // Force refresh bằng cách tăng refreshKey để trigger re-render MealCard
      // Điều này đảm bảo UI cập nhật ngay lập tức sau khi lưu/xóa
      setRefreshKey(prev => prev + 1);
      
      // Không hiển thị thông báo để tránh spam, UI sẽ tự động cập nhật icon bookmark
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Lỗi', 'Không thể lưu/hủy lưu món ăn');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header với back arrow */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#3C2C21" />
        </TouchableOpacity>
      </View>

      {/* Search Bar - cải thiện UI */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#9F9A94" style={{ marginLeft: 14, marginRight: 8 }} />
          <TextInput
            placeholder="Nhập tên món ăn hoặc nguyên liệu"
            placeholderTextColor="#B7B2AE"
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            autoFocus={true}
            autoCorrect={true}
            autoCapitalize="none"
            keyboardType="default"
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#9F9A94" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tags nguyên liệu - hàng ngang scroll */}
      <View style={styles.tagsSection}>
        <Text style={styles.tagsLabel}>Nguyên liệu phổ biến</Text>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContent}
          style={styles.tagsContainer}
        >
          {POPULAR_INGREDIENTS.map((ingredient) => {
            const isSelected = selectedIngredients.includes(ingredient);
            return (
              <TouchableOpacity
                key={ingredient}
                style={[
                  styles.ingredientTag,
                  isSelected && styles.ingredientTagSelected
                ]}
                onPress={() => toggleIngredient(ingredient)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.ingredientTagText,
                    isSelected && styles.ingredientTagTextSelected
                  ]}
                >
                  {ingredient}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Kết quả tìm kiếm */}
      <View style={styles.resultsContainer}>
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FAE2AF" />
            <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
          </View>
        ) : (searchText.trim() || selectedIngredients.length > 0) ? (
          searchResults.length > 0 ? (
            <ScrollView
              style={styles.resultsScroll}
              contentContainerStyle={styles.resultsContent}
              showsVerticalScrollIndicator={false}
            >
              {searchResults.map((meal) => (
                <MealCard
                  key={`${meal.id}-${refreshKey}`}
                  meal={meal}
                  onPress={() => {
                    // TODO: Navigate to meal detail screen
                    console.log('Meal selected:', meal);
                  }}
                  onBookmarkPress={handleBookmarkPress}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#D4C4B8" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>Không tìm thấy món ăn nào</Text>
              <Text style={styles.emptySubtitle}>Thử tìm kiếm với từ khóa khác hoặc chọn nguyên liệu khác</Text>
            </View>
          )
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={64} color="#D4C4B8" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Tìm kiếm món ăn</Text>
            <Text style={styles.emptySubtitle}>Nhập tên món ăn hoặc chọn nguyên liệu để bắt đầu tìm kiếm</Text>
          </View>
        )}
      </View>

      {/* Footer với 2 buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>Làm lại</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmSearch}
          activeOpacity={0.7}
          disabled={isSearching}
        >
          <Text style={styles.confirmButtonText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FA', // Nền sáng như trong ảnh
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0EEEC',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#3C2C21',
    paddingVertical: 4,
    paddingRight: 8,
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  tagsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  tagsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7D6E62',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  tagsContainer: {
    height: 44,
  },
  tagsContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
  },
  ingredientTag: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    marginRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ingredientTagSelected: {
    backgroundColor: '#FAE2AF', // Nền vàng nhạt cho tag được chọn
    borderColor: '#FAE2AF',
  },
  ingredientTagText: {
    fontSize: 13,
    color: '#7D6E62',
    fontWeight: '600',
  },
  ingredientTagTextSelected: {
    fontWeight: '700',
  },
  resultsContainer: {
    flex: 1,
    marginTop: 12,
    paddingBottom: 48, // Thu nhỏ khoảng trắng với footer
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#7D6E62',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#3C2C21',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#7D6E62',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10, // Thu gọn chiều cao footer
    backgroundColor: '#F6F6FA',
    borderTopWidth: 1,
    borderTopColor: '#EEE9E2',
    gap: 10,
  },
  resetButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3C2C21', // Border nâu đậm
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#3C2C21', // Text nâu đậm
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: '#FAE2AF', // Nền vàng nhạt
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#3C2C21', // Text nâu đậm
    fontWeight: '700',
  },
  // Styles cho meal cards (giống RecipeCard)
  mealCardShadow: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    marginBottom: 12,
  },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  mealCardRight: {
    width: 110,
    backgroundColor: '#EFD493',
  },
  mealTitle: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 22,
  },
  mealDesc: {
    color: '#8E7F73',
    marginTop: 6,
    fontSize: 14,
  },
  mealTime: {
    color: '#9A8A7B',
    marginTop: 10,
    fontWeight: '800',
    fontSize: 14,
  },
});
