import React, { useState } from 'react';
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
  const [hasSearched, setHasSearched] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Key để force re-render MealCard

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

  // Hàm xử lý khi bấm nút Xác nhận (tìm kiếm)
  const handleConfirmSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await searchMeals({
        searchText: searchText.trim(),
        ingredients: selectedIngredients,
      });
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Hàm reset tìm kiếm
  const handleReset = () => {
    setSearchText('');
    setSelectedIngredients([]);
    setSearchResults([]);
    setHasSearched(false);
  };

  // Xử lý khi bấm bookmark trong kết quả tìm kiếm (toggle save/unsave)
  const handleBookmarkPress = async (meal) => {
    try {
      // Xác định buổi ăn từ meal
      const mealTimeIndex = determineMealTime(meal);
      const wasAdded = await saveMeal(meal, mealTimeIndex);
      
      // Force refresh bằng cách tăng refreshKey để trigger re-render MealCard
      // Điều này đảm bảo UI cập nhật ngay lập tức sau khi lưu/xóa
      setRefreshKey(prev => prev + 1);
      
      // Hiển thị thông báo khi lưu thành công
      if (wasAdded) {
        Alert.alert('Thành công', 'Đã lưu vào meal mới nhất');
      }
      // Khi bỏ lưu (wasAdded = false), không hiện thông báo để tránh spam
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Lỗi', 'Không thể lưu món ăn');
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

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={20} color="#9F9A94" style={{ marginLeft: 10, marginRight: 6 }} />
        <TextInput
          placeholder="Nhập tên món ăn hoặc nguyên liệu"
          placeholderTextColor="#B7B2AE"
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          autoFocus={true}
        />
      </View>

      {/* Tags nguyên liệu - 2 hàng */}
      <ScrollView 
        style={styles.tagsContainer}
        contentContainerStyle={styles.tagsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tagsRow}>
          {/* Hàng 1: 4 tags đầu */}
          {POPULAR_INGREDIENTS.slice(0, 4).map((ingredient) => {
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
        </View>
        <View style={styles.tagsRow}>
          {/* Hàng 2: 6 tags còn lại */}
          {POPULAR_INGREDIENTS.slice(4).map((ingredient) => {
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
        </View>
      </ScrollView>

      {/* Kết quả tìm kiếm */}
      {hasSearched && (
        <View style={styles.resultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FAE2AF" />
              <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.resultsScroll}
              contentContainerStyle={styles.resultsContent}
              showsVerticalScrollIndicator={true}
            >
              {searchResults.length === 0 ? (
                <Text style={styles.noResultsText}>Không tìm thấy món ăn nào</Text>
              ) : (
                searchResults.map((meal) => (
                  <MealCard
                    key={`${meal.id}-${refreshKey}`}
                    meal={meal}
                    onPress={() => {
                      // TODO: Navigate to meal detail screen
                      console.log('Meal selected:', meal);
                    }}
                    onBookmarkPress={handleBookmarkPress}
                  />
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 20,
    backgroundColor: '#F0EEEC', // Màu xám nhạt cho search bar
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#3C2C21', // Màu nâu đậm cho text
    marginLeft: 6,
    paddingVertical: 4,
  },
  tagsContainer: {
    flex: 1,
    marginTop: 16,
  },
  tagsContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 10, // Khoảng cách giữa các tags
  },
  ingredientTag: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF', // Nền trắng cho tag chưa chọn
    borderWidth: 1,
    borderColor: '#3C2C21', // Border nâu đậm
    marginRight: 8,
    marginBottom: 8,
  },
  ingredientTagSelected: {
    backgroundColor: '#FAE2AF', // Nền vàng nhạt cho tag được chọn
    borderColor: '#FAE2AF',
  },
  ingredientTagText: {
    fontSize: 14,
    color: '#3C2C21', // Text nâu đậm
    fontWeight: '600',
  },
  ingredientTagTextSelected: {
    fontWeight: '700',
  },
  resultsContainer: {
    flex: 1,
    marginTop: 8,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100, // Để không bị che bởi footer buttons
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#8E7F73',
    fontSize: 16,
    fontWeight: '600',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#B6ADA7',
    fontWeight: '800',
    fontSize: 18,
    marginTop: 40,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F6F6FA',
    borderTopWidth: 1,
    borderTopColor: '#EEE9E2',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
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
    paddingVertical: 14,
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
