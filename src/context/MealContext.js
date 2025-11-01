import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const MealContext = createContext(null);

export function MealProvider({ children }) {
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [mealsByDate, setMealsByDate] = useState({});

  const saveMealForDate = useCallback((dateKey, slotKey, mealItem) => {
    setMealsByDate(prev => {
      const prevDate = prev[dateKey] || {};
      return { ...prev, [dateKey]: { ...prevDate, [slotKey]: mealItem } };
    });
  }, []);

  const value = useMemo(() => ({
    capturedImageUri,
    setCapturedImageUri,
    analysisResults,
    setAnalysisResults,
    mealsByDate,
    saveMealForDate,
  }), [capturedImageUri, analysisResults, mealsByDate, saveMealForDate]);

  return (
    <MealContext.Provider value={value}>{children}</MealContext.Provider>
  );
}

export function useMeals() {
  const ctx = useContext(MealContext);
  if (!ctx) throw new Error('useMeals must be used within MealProvider');
  return ctx;
}


