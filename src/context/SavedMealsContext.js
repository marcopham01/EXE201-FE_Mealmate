import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId, subscribeToUserIdChanges } from '../utils/userSession';
import { 
  getSavedMealsFromServer, 
  saveMealToServer, 
  deleteSavedMealFromServer 
} from '../api/meals';

const SavedMealsContext = createContext(null);

// Key để lưu trong AsyncStorage
const STORAGE_KEY = 'savedMeals';
const getStorageKeyForUser = (userId) => userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

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
  
  // Refs để tránh re-render không cần thiết
  const isLoadingRef = useRef(false);
  const storageDebounceTimerRef = useRef(null);

  // Load từ server theo userId (với fallback về AsyncStorage)
  const loadSavedMeals = useCallback(async (userIdOverride) => {
    // Tránh load đồng thời nhiều lần
    if (isLoadingRef.current) {
      console.log('[SavedMealsContext] Already loading, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    
    try {
      const userId = userIdOverride ?? await getCurrentUserId();
      if (!userId) {
        // Nếu chưa có userId, load từ AsyncStorage
        const storageKey = getStorageKeyForUser(null);
        const data = await AsyncStorage.getItem(storageKey);
        if (data) {
          const parsed = JSON.parse(data);
          setSavedMeals({
            breakfast: parsed.breakfast || [],
            lunch: parsed.lunch || [],
            dinner: parsed.dinner || [],
          });
        } else {
          setSavedMeals({ breakfast: [], lunch: [], dinner: [] });
        }
        isLoadingRef.current = false;
        return;
      }

      // Load từ server
      console.log('[SavedMealsContext] Loading saved meals from server...');
      let allSavedMeals = [];
      let currentPage = 1;
      let hasMore = true;
      const limit = 50;
      const maxPages = 10; // Giới hạn tối đa 10 pages để tránh load quá nhiều

      // Load tất cả pages
      while (hasMore && currentPage <= maxPages) {
        try {
          const result = await getSavedMealsFromServer({ page: currentPage, limit });
          if (result && result.data && Array.isArray(result.data)) {
            allSavedMeals = [...allSavedMeals, ...result.data];
            hasMore = result.pagination?.hasNextPage || false;
            currentPage++;
            
            if (result.data.length === 0) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        } catch (error) {
          console.warn('[SavedMealsContext] Error loading from server, using cache:', error.message);
          hasMore = false;
        }
      }

      // Phân loại meals theo mealTime từ tags
      const categorized = {
        breakfast: [],
        lunch: [],
        dinner: [],
      };

      allSavedMeals.forEach(savedItem => {
        const meal = savedItem.meal || savedItem;
        const tags = savedItem.tags || [];
        
        // Tìm mealTime từ tags (format: 'mealTime:breakfast', 'mealTime:lunch', 'mealTime:dinner')
        let mealTime = null;
        const mealTimeTag = tags.find(tag => tag.startsWith('mealTime:'));
        if (mealTimeTag) {
          mealTime = mealTimeTag.replace('mealTime:', '');
        } else {
          // Fallback: dùng mealTime từ meal object nếu có
          if (meal.mealTime && Array.isArray(meal.mealTime) && meal.mealTime.length > 0) {
            mealTime = meal.mealTime[0];
          }
        }

        // Map meal vào category tương ứng
        if (mealTime === 'breakfast') {
          categorized.breakfast.push(meal);
        } else if (mealTime === 'lunch') {
          categorized.lunch.push(meal);
        } else if (mealTime === 'dinner') {
          categorized.dinner.push(meal);
        } else {
          // Nếu không có mealTime, thêm vào breakfast mặc định
          categorized.breakfast.push(meal);
        }
      });

      setSavedMeals(categorized);

      // Lưu vào AsyncStorage làm cache
      const storageKey = getStorageKeyForUser(userId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(categorized));

      console.log('[SavedMealsContext] Loaded from server:', {
        total: allSavedMeals.length,
        breakfast: categorized.breakfast.length,
        lunch: categorized.lunch.length,
        dinner: categorized.dinner.length,
      });
    } catch (error) {
      console.error('[SavedMealsContext] Error loading saved meals:', error);
      // Fallback về AsyncStorage
      try {
        const userId = userIdOverride ?? await getCurrentUserId();
        const storageKey = getStorageKeyForUser(userId);
        const data = await AsyncStorage.getItem(storageKey);
        if (data) {
          const parsed = JSON.parse(data);
          setSavedMeals({
            breakfast: parsed.breakfast || [],
            lunch: parsed.lunch || [],
            dinner: parsed.dinner || [],
          });
        } else {
          setSavedMeals({ breakfast: [], lunch: [], dinner: [] });
        }
      } catch (storageError) {
        console.error('[SavedMealsContext] Error loading from storage:', storageError);
        setSavedMeals({ breakfast: [], lunch: [], dinner: [] });
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  // Lắng nghe thay đổi userId
  useEffect(() => {
    loadSavedMeals();
    const unsubscribe = subscribeToUserIdChanges(async (userId, oldUserId) => {
      // Clear local state khi đổi user
      setSavedMeals({ breakfast: [], lunch: [], dinner: [] });
      
      // Clear AsyncStorage cache của user cũ nếu có
      if (oldUserId) {
        try {
          const oldStorageKey = getStorageKeyForUser(oldUserId);
          await AsyncStorage.removeItem(oldStorageKey);
          console.log('[SavedMealsContext] Cleared AsyncStorage cache for old user:', oldUserId);
        } catch (error) {
          console.warn('[SavedMealsContext] Error clearing old user cache:', error);
        }
      }
      
      // Load data cho user mới
      await loadSavedMeals(userId);
    });
    return () => unsubscribe && unsubscribe();
  }, [loadSavedMeals]);

  // Lưu vào AsyncStorage (theo userId) - với debounce để tránh write quá nhiều
  const saveToStorage = useCallback(async (meals) => {
    // Clear timer cũ nếu có
    if (storageDebounceTimerRef.current) {
      clearTimeout(storageDebounceTimerRef.current);
    }
    
    // Debounce 500ms để tránh write quá nhiều lần
    storageDebounceTimerRef.current = setTimeout(async () => {
      try {
        const userId = await getCurrentUserId();
        const storageKey = getStorageKeyForUser(userId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(meals));
      } catch (error) {
        console.error('Error saving meals to storage:', error);
      }
    }, 500);
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

    // Kiểm tra xem meal đã tồn tại chưa (dựa vào id trong state hiện tại)
    // Sử dụng functional update để tránh dependency vào savedMeals
    let isCurrentlySaved = false;
    let wasAdded = false;

    setSavedMeals(prev => {
      isCurrentlySaved = prev[mealTimeKey].some(m => m.id === meal.id);
      return prev; // Không thay đổi state ở đây
    });

    try {
      const userId = await getCurrentUserId();
      
      if (isCurrentlySaved) {
        // Nếu đã tồn tại, xóa khỏi server
        wasAdded = false;
        try {
          await deleteSavedMealFromServer(meal.id);
          console.log('[SavedMealsContext] Meal removed from server:', {
            action: 'REMOVED',
            mealId: meal.id,
            mealTitle: meal.title || meal.name,
            mealTime: mealTimeKey,
          });
        } catch (error) {
          console.warn('[SavedMealsContext] Error deleting from server:', error.message);
          // Vẫn tiếp tục update local state
        }

        // Update local state
        setSavedMeals(prev => {
          const newMeals = { ...prev };
          newMeals[mealTimeKey] = newMeals[mealTimeKey].filter(m => m.id !== meal.id);
          saveToStorage(newMeals);
          return newMeals;
        });
      } else {
        // Nếu chưa tồn tại, lưu lên server
        wasAdded = true;
        
        // Lưu mealTime vào tags để có thể phân loại sau này
        const tags = [`mealTime:${mealTimeKey}`];
        
        try {
          await saveMealToServer({
            mealId: meal.id,
            note: '',
            tags: tags,
          });
          console.log('[SavedMealsContext] Meal saved to server:', {
            action: 'SAVED',
            mealId: meal.id,
            mealTitle: meal.title || meal.name,
            mealTime: mealTimeKey,
          });
        } catch (error) {
          console.warn('[SavedMealsContext] Error saving to server:', error.message);
          // Vẫn tiếp tục update local state
        }

        // Update local state
        setSavedMeals(prev => {
          const newMeals = { ...prev };
          const mealToSave = {
            ...meal,
            savedAt: new Date().toISOString(),
          };
          newMeals[mealTimeKey] = [
            mealToSave,
            ...newMeals[mealTimeKey],
          ];
          saveToStorage(newMeals);
          return newMeals;
        });
      }
    } catch (error) {
      console.error('[SavedMealsContext] Error in saveMeal:', error);
      // Fallback: chỉ update local state nếu không có userId
      if (!isCurrentlySaved) {
        setSavedMeals(prev => {
          const newMeals = { ...prev };
          const mealToSave = {
            ...meal,
            savedAt: new Date().toISOString(),
          };
          newMeals[mealTimeKey] = [
            mealToSave,
            ...newMeals[mealTimeKey],
          ];
          saveToStorage(newMeals);
          return newMeals;
        });
        wasAdded = true;
      } else {
        setSavedMeals(prev => {
          const newMeals = { ...prev };
          newMeals[mealTimeKey] = newMeals[mealTimeKey].filter(m => m.id !== meal.id);
          saveToStorage(newMeals);
          return newMeals;
        });
        wasAdded = false;
      }
    }

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

    try {
      // Xóa khỏi server
      const userId = await getCurrentUserId();
      if (userId) {
        try {
          await deleteSavedMealFromServer(mealId);
          console.log('[SavedMealsContext] Meal removed from server:', mealId);
        } catch (error) {
          console.warn('[SavedMealsContext] Error deleting from server:', error.message);
          // Vẫn tiếp tục update local state
        }
      }
    } catch (error) {
      console.warn('[SavedMealsContext] Error in removeMeal:', error.message);
    }

    // Update local state
    setSavedMeals(prev => {
      const newMeals = { ...prev };
      newMeals[mealTimeKey] = newMeals[mealTimeKey].filter(m => m.id !== mealId);
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

  // Memoize value để tránh re-render không cần thiết
  const value = useMemo(() => ({
    savedMeals,
    saveMeal,
    removeMeal,
    isMealSaved,
    getSavedMealsByTime,
    determineMealTime,
    loadSavedMeals,
  }), [savedMeals, saveMeal, removeMeal, isMealSaved, getSavedMealsByTime, determineMealTime, loadSavedMeals]);

  // Cleanup debounce timer khi unmount
  useEffect(() => {
    return () => {
      if (storageDebounceTimerRef.current) {
        clearTimeout(storageDebounceTimerRef.current);
      }
    };
  }, []);

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
