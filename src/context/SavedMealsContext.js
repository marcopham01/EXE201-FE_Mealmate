import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SavedMealsContext = createContext(null);

// Key để lưu trong AsyncStorage
const STORAGE_KEY = 'savedMeals';

// Map từ index buổi sang key
const MEAL_TIME_MAP = {
  0: 'breakfast', // Sáng
  1: 'lunch',     // Trưa
  2: 'dinner',    // Tối
};

// Map ngược từ key sang index
const MEAL_TIME_REVERSE_MAP = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
};

export function SavedMealsProvider({ children }) {
  const [savedMeals, setSavedMeals] = useState({
    breakfast: [], // Sáng
    lunch: [],     // Trưa
    dinner: [],    // Tối
  });

  // Load saved meals từ AsyncStorage khi mount
  useEffect(() => {
    loadSavedMeals();
  }, []);

  // Load từ AsyncStorage
  const loadSavedMeals = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setSavedMeals({
          breakfast: parsed.breakfast || [],
          lunch: parsed.lunch || [],
          dinner: parsed.dinner || [],
        });
      }
    } catch (error) {
      console.error('Error loading saved meals:', error);
    }
  }, []);

  // Lưu vào AsyncStorage
  const saveToStorage = useCallback(async (meals) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
    } catch (error) {
      console.error('Error saving meals to storage:', error);
    }
  }, []);

  /**
   * Lưu một meal vào danh sách theo buổi ăn (toggle: nếu đã có thì xóa, chưa có thì thêm)
   * @param {Object} meal - Meal object cần lưu
   * @param {number} mealTimeIndex - Index buổi ăn (0: Sáng, 1: Trưa, 2: Tối)
   * @returns {Promise<boolean>} true nếu đã lưu, false nếu đã xóa
   */
  const saveMeal = useCallback(async (meal, mealTimeIndex) => {
    const mealTimeKey = MEAL_TIME_MAP[mealTimeIndex];
    if (!mealTimeKey) {
      console.error('Invalid mealTimeIndex:', mealTimeIndex);
      return false;
    }

    let wasAdded = false;

    setSavedMeals(prev => {
      const newMeals = { ...prev };
      
      // Kiểm tra xem meal đã tồn tại chưa (dựa vào id)
      const existingIndex = newMeals[mealTimeKey].findIndex(
        m => m.id === meal.id
      );

      if (existingIndex >= 0) {
        // Nếu đã tồn tại, xóa khỏi danh sách (toggle off)
        wasAdded = false;
        newMeals[mealTimeKey] = newMeals[mealTimeKey].filter(m => m.id !== meal.id);
      } else {
        // Nếu chưa tồn tại, thêm vào đầu danh sách (toggle on)
        wasAdded = true;
        newMeals[mealTimeKey] = [
          {
            ...meal,
            savedAt: new Date().toISOString(),
          },
          ...newMeals[mealTimeKey],
        ];
      }
      console.log('newMeals:', newMeals[mealTimeKey]);

      // Lưu vào storage
      saveToStorage(newMeals);

      return newMeals;
    });

    return wasAdded;
  }, [saveToStorage]);

  /**
   * Xóa một meal khỏi danh sách
   * @param {string} mealId - ID của meal cần xóa
   * @param {number} mealTimeIndex - Index buổi ăn
   */
  const removeMeal = useCallback(async (mealId, mealTimeIndex) => {
    const mealTimeKey = MEAL_TIME_MAP[mealTimeIndex];
    if (!mealTimeKey) return false;

    setSavedMeals(prev => {
      const newMeals = { ...prev };
      newMeals[mealTimeKey] = newMeals[mealTimeKey].filter(m => m.id !== mealId);
      
      // Lưu vào storage
      saveToStorage(newMeals);

      return newMeals;
    });

    return true;
  }, [saveToStorage]);

  /**
   * Kiểm tra xem meal đã được lưu chưa
   * @param {string} mealId - ID của meal
   * @param {number} mealTimeIndex - Index buổi ăn
   */
  const isMealSaved = useCallback((mealId, mealTimeIndex) => {
    const mealTimeKey = MEAL_TIME_MAP[mealTimeIndex];
    if (!mealTimeKey) return false;

    return savedMeals[mealTimeKey].some(m => m.id === mealId);
  }, [savedMeals]);

  /**
   * Lấy danh sách meals đã lưu theo buổi ăn
   * @param {number} mealTimeIndex - Index buổi ăn (0: Sáng, 1: Trưa, 2: Tối)
   */
  const getSavedMealsByTime = useCallback((mealTimeIndex) => {
    const mealTimeKey = MEAL_TIME_MAP[mealTimeIndex];
    if (!mealTimeKey) return [];
    
    return savedMeals[mealTimeKey] || [];
  }, [savedMeals]);

  /**
   * Xác định buổi ăn từ meal object dựa trên mealTime từ database
   * Ưu tiên: breakfast -> lunch -> dinner
   * Nếu không có mealTime, trả về null để dùng buổi hiện tại đang chọn
   */
  const determineMealTime = useCallback((meal) => {
    // Nếu meal có mealTime property từ database
    if (meal.mealTime && Array.isArray(meal.mealTime) && meal.mealTime.length > 0) {
      // Ưu tiên theo thứ tự: breakfast -> lunch -> dinner
      if (meal.mealTime.includes('breakfast')) return 0; // Sáng
      if (meal.mealTime.includes('lunch')) return 1; // Trưa
      if (meal.mealTime.includes('dinner')) return 2; // Tối
      // Nếu có mealTime nhưng không match, lấy buổi đầu tiên
      const time = meal.mealTime[0];
      if (time === 'breakfast') return 0;
      if (time === 'lunch') return 1;
      if (time === 'dinner') return 2;
    }
    // Nếu không có mealTime, trả về null để dùng buổi hiện tại đang chọn
    return null;
  }, []);

  const value = {
    savedMeals,
    saveMeal,
    removeMeal,
    isMealSaved,
    getSavedMealsByTime,
    determineMealTime,
    loadSavedMeals,
  };

  return (
    <SavedMealsContext.Provider value={value}>
      {children}
    </SavedMealsContext.Provider>
  );
}

export function useSavedMeals() {
  const ctx = useContext(SavedMealsContext);
  if (!ctx) {
    throw new Error('useSavedMeals must be used within SavedMealsProvider');
  }
  return ctx;
}

// Export constants để dùng ở nơi khác
export { MEAL_TIME_MAP, MEAL_TIME_REVERSE_MAP };
