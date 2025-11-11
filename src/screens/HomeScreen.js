import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FixedHeader from '../components/FixedHeader';
import WeekStrip from '../components/WeekStrip';
import { useWeek } from '../context/WeekContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePremium } from '../context/PremiumContext';
import { useMeals } from '../context/MealsContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const today = new Date();
  const dayIndexMon0 = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setHours(0,0,0,0);
  monday.setDate(today.getDate() - dayIndexMon0);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const weekLabels = ['T2','T3','T4','T5','T6','T7','CN'];

  const { selectedDayIdx, setSelectedDayIdx } = useWeek();
  const { premiumActive, refreshPremiumStatus } = usePremium();

  // Cập nhật theo thời gian thực khi quay lại màn hình hoặc khi bấm vào tab "Nhật ký"
  // useFocusEffect sẽ tự động trigger khi màn hình được focus (bao gồm khi bấm vào tab)
  useFocusEffect(React.useCallback(() => {
    const now = new Date();
    const idx = (now.getDay() + 6) % 7;
    setSelectedDayIdx(idx);
    
    // Refresh premium status khi quay lại HomeScreen để đảm bảo hiển thị đúng
    // Đặc biệt quan trọng sau khi hoàn thành thanh toán và onboarding
    // Cũng refresh khi bấm vào tab "Nhật ký" (sẽ trigger focus event từ BottomTabs)
    refreshPremiumStatus();
  }, [setSelectedDayIdx, refreshPremiumStatus]));

  const selectedDate = weekDates[selectedDayIdx];
  const dateStr = `${selectedDate.getDate()}/${selectedDate.getMonth()+1}/${selectedDate.getFullYear()}`;
  const { getMealsForDate, clearMealForDate } = useMeals();
  const meals = getMealsForDate(selectedDate);

  const handleRemoveMeal = React.useCallback((mealType) => {
    try {
      clearMealForDate(selectedDate, mealType);
    } catch (e) {
      console.error('Remove meal error:', e);
    }
  }, [clearMealForDate, selectedDate]);

  return (
    <SafeAreaView style={styles.container}>
      <FixedHeader onPressPremium={premiumActive ? undefined : () => navigation.navigate('Premium')} />
      <WeekStrip weekLabels={weekLabels} weekDates={weekDates} selectedIdx={selectedDayIdx} onChange={setSelectedDayIdx}/>
      <View style={styles.body}>
        <View style={styles.softDivider} />
        <View style={styles.sectionDate}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#5A5A5A" />
          <Text style={styles.sectionDateText}>{`Bữa ăn vào ${dateStr}`}</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BỮA SÁNG</Text>
          <View style={styles.mealCardShadow}>
            <TouchableOpacity style={styles.mealCardRow} activeOpacity={0.9} onPress={() => meals.breakfast && navigation.navigate('MealDetails', { mealId: meals.breakfast.id, meal: meals.breakfast })}>
              {meals.breakfast ? (
                <>
                  <View style={{ flex: 1, padding: 14 }}>
                    <Text style={{ fontWeight: '900', color: '#3C2C21', fontSize: 16 }}>{meals.breakfast.title}</Text>
                    <Text style={{ color: '#8D8074', marginTop: 4 }} numberOfLines={2}>{meals.breakfast.desc}</Text>
                    {meals.breakfast.time ? <Text style={{ color: '#9A8A7B', marginTop: 10, fontWeight: '800' }}>{`Thời gian: ${meals.breakfast.time}`}</Text> : null}
                  </View>
                  <View style={styles.mealRightPanel} />
                  <TouchableOpacity onPress={() => handleRemoveMeal('breakfast')} activeOpacity={0.8} style={styles.deleteBtn}>
                    <Ionicons name="remove" size={18} color="#B00020" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={() => navigation.navigate('Recipes', { mealType: 'breakfast', date: selectedDate.toISOString() })}>
                  <View style={styles.mealAdd}> 
                    <MaterialCommunityIcons name="plus-circle-outline" size={40} color="#D1CBC6" />
                    <Text style={styles.mealAddText}>CHỌN MÓN ĂN</Text>
                  </View>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BỮA TRƯA</Text>
          <View style={styles.mealCardShadow}>
            <TouchableOpacity style={styles.mealCardRow} activeOpacity={0.9} onPress={() => meals.lunch && navigation.navigate('MealDetails', { mealId: meals.lunch.id, meal: meals.lunch })}>
              {meals.lunch ? (
                <>
                  <View style={{ flex: 1, padding: 14 }}>
                    <Text style={{ fontWeight: '900', color: '#3C2C21', fontSize: 16 }}>{meals.lunch.title}</Text>
                    <Text style={{ color: '#8D8074', marginTop: 4 }} numberOfLines={2}>{meals.lunch.desc}</Text>
                    {meals.lunch.time ? <Text style={{ color: '#9A8A7B', marginTop: 10, fontWeight: '800' }}>{`Thời gian: ${meals.lunch.time}`}</Text> : null}
                  </View>
                  <View style={styles.mealRightPanel} />
                  <TouchableOpacity onPress={() => handleRemoveMeal('lunch')} activeOpacity={0.8} style={styles.deleteBtn}>
                    <Ionicons name="remove" size={18} color="#B00020" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={() => navigation.navigate('Recipes', { mealType: 'lunch', date: selectedDate.toISOString() })}>
                  <View style={styles.mealAdd}> 
                    <MaterialCommunityIcons name="plus-circle-outline" size={40} color="#D1CBC6" />
                    <Text style={styles.mealAddText}>CHỌN MÓN ĂN</Text>
                  </View>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BỮA TỐI</Text>
          <View style={styles.mealCardShadow}>
            <TouchableOpacity style={styles.mealCardRow} activeOpacity={0.9} onPress={() => meals.dinner && navigation.navigate('MealDetails', { mealId: meals.dinner.id, meal: meals.dinner })}>
              {meals.dinner ? (
                <>
                  <View style={{ flex: 1, padding: 14 }}>
                    <Text style={{ fontWeight: '900', color: '#3C2C21', fontSize: 16 }}>{meals.dinner.title}</Text>
                    <Text style={{ color: '#8D8074', marginTop: 4 }} numberOfLines={2}>{meals.dinner.desc}</Text>
                    {meals.dinner.time ? <Text style={{ color: '#9A8A7B', marginTop: 10, fontWeight: '800' }}>{`Thời gian: ${meals.dinner.time}`}</Text> : null}
                  </View>
                  <View style={styles.mealRightPanel} />
                  <TouchableOpacity onPress={() => handleRemoveMeal('dinner')} activeOpacity={0.8} style={styles.deleteBtn}>
                    <Ionicons name="remove" size={18} color="#B00020" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={() => navigation.navigate('Recipes', { mealType: 'dinner', date: selectedDate.toISOString() })}>
                  <View style={styles.mealAdd}> 
                    <MaterialCommunityIcons name="plus-circle-outline" size={40} color="#D1CBC6" />
                    <Text style={styles.mealAddText}>CHỌN MÓN ĂN</Text>
                  </View>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1, backgroundColor: '#F6F6FA' },
  softDivider: { height: 1, backgroundColor: '#EEE9E2', marginHorizontal: 16, opacity: 0.7 },
  sectionDate: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  sectionDateText: { fontSize: 16, fontWeight: '900', color: '#3C2C21', letterSpacing: 0.2 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#4D3B2C', marginBottom: 10, letterSpacing: 0.2 },
  mealCardShadow: { borderRadius: 16, backgroundColor: '#0000', shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  mealCardRow: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', flexDirection: 'row', minHeight: 110 },
  mealRightPanel: { width: 110, backgroundColor: '#EFD493' },
  mealAdd: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mealAddText: { marginTop: 8, color: '#C8C3BE', fontWeight: '800', fontSize: 12 },
  deleteBtn: { position: 'absolute', top: 6, right: 8, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
});


