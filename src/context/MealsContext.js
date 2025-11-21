import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId, subscribeToUserIdChanges } from '../utils/userSession';
import { 
  getMealLogsFromServer, 
  logMealToServer, 
  deleteMealLogFromServer 
} from '../api/meals';

const MealsContext = createContext(null);

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const STORAGE_KEY = 'mealsByDate';
const getStorageKeyForUser = (userId) => userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

export function MealsProvider({ children }) {
  const [mealsByDate, setMealsByDate] = useState({});
  
  // Refs để tối ưu performance
  const isLoadingRef = useRef(false);
  const storageDebounceTimerRef = useRef(null);
  const logIdsCacheRef = useRef({}); // Cache logIds để tránh load lại khi clear

  const loadFromStorage = useCallback(async (userIdOverride) => {
    // Tránh load đồng thời nhiều lần
    if (isLoadingRef.current) {
      console.log('[MealsContext] Already loading, skipping...');
      return;
    }
    
    isLoadingRef.current = true;
    
    try {
      const userId = userIdOverride ?? await getCurrentUserId();
      if (!userId) {
        // Nếu chưa có userId, load từ AsyncStorage
        const storageKey = getStorageKeyForUser(null);
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setMealsByDate(parsed);
            isLoadingRef.current = false;
            return;
          }
        }
        setMealsByDate({});
        isLoadingRef.current = false;
        return;
      }

      // Load từ server - lấy logs cho 7 ngày gần nhất
      console.log('[MealsContext] Loading meal logs from server...');
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7); // 7 ngày trước
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7); // 7 ngày sau

      const startDateStr = formatDateKey(startDate);
      const endDateStr = formatDateKey(endDate);

      try {
        const logsData = await getMealLogsFromServer({
          startDate: startDateStr,
          endDate: endDateStr,
        });

        // Transform logs data từ server format sang format của MealsContext
        // Server format: { 'YYYY-MM-DD': { breakfast: [log1, log2], lunch: [...], dinner: [...] } }
        // MealsContext format: { 'YYYY-MM-DD': { breakfast: meal, lunch: meal, dinner: meal } }
        const transformed = {};
        const logIdsCache = {}; // Cache logIds để dùng khi clear
        
        if (logsData && typeof logsData === 'object') {
          Object.keys(logsData).forEach(dateKey => {
            const dayLogs = logsData[dateKey];
            if (dayLogs && typeof dayLogs === 'object') {
              transformed[dateKey] = {};
              
              // Lấy meal đầu tiên từ mỗi mealTime (hoặc có thể lấy meal mới nhất)
              ['breakfast', 'lunch', 'dinner'].forEach(mealTime => {
                if (Array.isArray(dayLogs[mealTime]) && dayLogs[mealTime].length > 0) {
                  // Lấy log mới nhất (hoặc log đầu tiên)
                  const latestLog = dayLogs[mealTime][dayLogs[mealTime].length - 1];
                  if (latestLog && latestLog.meal) {
                    transformed[dateKey][mealTime] = latestLog.meal;
                    // Cache logIds để dùng khi clear
                    const cacheKey = `${dateKey}:${mealTime}`;
                    logIdsCache[cacheKey] = dayLogs[mealTime].map(log => log._id).filter(Boolean);
                  }
                }
              });
            }
          });
        }
        
        // Update cache
        logIdsCacheRef.current = logIdsCache;

        setMealsByDate(transformed);

        // Lưu vào AsyncStorage làm cache
        const storageKey = getStorageKeyForUser(userId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(transformed));

        console.log('[MealsContext] Loaded from server:', {
          dateCount: Object.keys(transformed).length,
        });
      } catch (error) {
        console.warn('[MealsContext] Error loading from server, using cache:', error.message);
        // Fallback về AsyncStorage
        const storageKey = getStorageKeyForUser(userId);
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setMealsByDate(parsed);
            return;
          }
        }
        setMealsByDate({});
      }
    } catch (e) {
      console.error('[MealsContext] Load error:', e);
      setMealsByDate({});
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    const unsubscribe = subscribeToUserIdChanges(async (userId, oldUserId) => {
      // Clear local state khi đổi user
      setMealsByDate({});
      
      // Clear AsyncStorage cache của user cũ nếu có
      if (oldUserId) {
        try {
          const oldStorageKey = getStorageKeyForUser(oldUserId);
          await AsyncStorage.removeItem(oldStorageKey);
          console.log('[MealsContext] Cleared AsyncStorage cache for old user:', oldUserId);
        } catch (error) {
          console.warn('[MealsContext] Error clearing old user cache:', error);
        }
      }
      
      // Load data cho user mới
      await loadFromStorage(userId);
    });
    return () => unsubscribe && unsubscribe();
  }, [loadFromStorage]);

  const persist = useCallback(async (state) => {
    // Clear timer cũ nếu có
    if (storageDebounceTimerRef.current) {
      clearTimeout(storageDebounceTimerRef.current);
    }
    
    // Debounce 500ms để tránh write quá nhiều lần
    storageDebounceTimerRef.current = setTimeout(async () => {
      try {
        const userId = await getCurrentUserId();
        const storageKey = getStorageKeyForUser(userId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(state));
      } catch (e) {
        console.error('MealsContext persist error:', e);
      }
    }, 500);
  }, []);

  const setMealForDate = useCallback(async (date, mealType, mealItem) => {
    const key = formatDateKey(date);
    
    // Lưu lên server
    try {
      const userId = await getCurrentUserId();
      if (userId && mealItem && mealItem.id) {
        try {
          await logMealToServer({
            mealId: mealItem.id,
            mealTime: mealType, // 'breakfast', 'lunch', 'dinner'
            date: key,
            portion: 1,
            note: '',
            caloriesOverride: 0,
          });
          console.log('[MealsContext] Meal logged to server:', {
            date: key,
            mealType,
            mealId: mealItem.id,
          });
        } catch (error) {
          console.warn('[MealsContext] Error logging to server:', error.message);
          // Vẫn tiếp tục update local state
        }
      }
    } catch (error) {
      console.warn('[MealsContext] Error in setMealForDate:', error.message);
    }

    // Update local state
    setMealsByDate(prev => {
      const existing = prev[key] || {};
      const next = { ...prev, [key]: { ...existing, [mealType]: mealItem } };
      // persist
      persist(next);
      return next;
    });
  }, [persist]);

  const clearMealForDate = useCallback(async (date, mealType) => {
    const key = formatDateKey(date);
    
    // Xóa khỏi server - sử dụng cache logIds để tránh load lại
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        try {
          const cacheKey = `${key}:${mealType}`;
          let logIdsToDelete = logIdsCacheRef.current[cacheKey];
          
          // Nếu không có trong cache, load từ server
          if (!logIdsToDelete || logIdsToDelete.length === 0) {
            const logsData = await getMealLogsFromServer({
              startDate: key,
              endDate: key,
            });
            
            if (logsData && logsData[key] && Array.isArray(logsData[key][mealType])) {
              logIdsToDelete = logsData[key][mealType].map(log => log._id).filter(Boolean);
              // Update cache
              logIdsCacheRef.current[cacheKey] = logIdsToDelete;
            }
          }
          
          // Xóa tất cả logs
          if (logIdsToDelete && logIdsToDelete.length > 0) {
            // Xóa song song để tăng tốc
            await Promise.allSettled(
              logIdsToDelete.map(logId => 
                deleteMealLogFromServer(logId).catch(error => {
                  console.warn('[MealsContext] Error deleting log from server:', error.message);
                })
              )
            );
            console.log('[MealsContext] Meal logs deleted from server:', logIdsToDelete.length);
            
            // Xóa khỏi cache
            delete logIdsCacheRef.current[cacheKey];
          }
        } catch (error) {
          console.warn('[MealsContext] Error deleting from server:', error.message);
          // Vẫn tiếp tục update local state
        }
      }
    } catch (error) {
      console.warn('[MealsContext] Error in clearMealForDate:', error.message);
    }

    // Update local state
    setMealsByDate(prev => {
      const existing = { ...(prev[key] || {}) };
      delete existing[mealType];
      const next = { ...prev, [key]: existing };
      // persist
      persist(next);
      return next;
    });
  }, [persist]);

  const getMealsForDate = useCallback((date) => {
    const key = formatDateKey(date);
    return mealsByDate[key] || {};
  }, [mealsByDate]);

  const value = useMemo(() => ({ mealsByDate, setMealForDate, clearMealForDate, getMealsForDate }), [mealsByDate, setMealForDate, clearMealForDate, getMealsForDate]);
  
  // Cleanup debounce timer khi unmount
  useEffect(() => {
    return () => {
      if (storageDebounceTimerRef.current) {
        clearTimeout(storageDebounceTimerRef.current);
      }
    };
  }, []);
  
  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

export function useMeals() {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error('useMeals must be used within MealsProvider');
  return ctx;
}


