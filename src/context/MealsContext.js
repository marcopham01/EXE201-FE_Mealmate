import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MealsContext = createContext(null);

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function MealsProvider({ children }) {
  const [mealsByDate, setMealsByDate] = useState({});
  const STORAGE_KEY = 'mealsByDate';

  // Load persisted data on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setMealsByDate(parsed);
          }
        }
      } catch (e) {
        console.error('MealsContext load error:', e);
      }
    })();
  }, []);

  const persist = useCallback(async (state) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('MealsContext persist error:', e);
    }
  }, []);

  const setMealForDate = useCallback((date, mealType, mealItem) => {
    const key = formatDateKey(date);
    setMealsByDate(prev => {
      const existing = prev[key] || {};
      const next = { ...prev, [key]: { ...existing, [mealType]: mealItem } };
      // persist
      persist(next);
      return next;
    });
  }, [persist]);

  const clearMealForDate = useCallback((date, mealType) => {
    const key = formatDateKey(date);
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
  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

export function useMeals() {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error('useMeals must be used within MealsProvider');
  return ctx;
}


