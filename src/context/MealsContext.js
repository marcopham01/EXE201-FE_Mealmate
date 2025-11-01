import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const MealsContext = createContext(null);

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function MealsProvider({ children }) {
  const [mealsByDate, setMealsByDate] = useState({});

  const setMealForDate = useCallback((date, mealType, mealItem) => {
    const key = formatDateKey(date);
    setMealsByDate(prev => {
      const existing = prev[key] || {};
      return { ...prev, [key]: { ...existing, [mealType]: mealItem } };
    });
  }, []);

  const getMealsForDate = useCallback((date) => {
    const key = formatDateKey(date);
    return mealsByDate[key] || {};
  }, [mealsByDate]);

  const value = useMemo(() => ({ mealsByDate, setMealForDate, getMealsForDate }), [mealsByDate, setMealForDate, getMealsForDate]);
  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

export function useMeals() {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error('useMeals must be used within MealsProvider');
  return ctx;
}


