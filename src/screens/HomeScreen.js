import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const { premiumActive } = usePremium();

  // Cập nhật theo thời gian thực khi quay lại màn hình
  useFocusEffect(React.useCallback(() => {
    const now = new Date();
    const idx = (now.getDay() + 6) % 7;
    setSelectedDayIdx(idx);
  }, [setSelectedDayIdx]));

  const selectedDate = weekDates[selectedDayIdx];
  const dateStr = `${selectedDate.getDate()}/${selectedDate.getMonth()+1}/${selectedDate.getFullYear()}`;
  const { getMealsForDate } = useMeals();
  const meals = getMealsForDate(selectedDate);

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BỮA SÁNG</Text>
          <View style={styles.mealCardShadow}>
            <View style={styles.mealCard}> 
              {meals.breakfast ? (
                <View>
                  <Text style={{ fontWeight: '900', color: '#3C2C21' }}>{meals.breakfast.title}</Text>
                  <Text style={{ color: '#8D8074', marginTop: 4 }}>{meals.breakfast.desc}</Text>
                </View>
              ) : (
                <View style={styles.mealAdd}> 
                  <Ionicons name="add-circle-outline" size={40} color="#D1CBC6" />
                  <Text style={styles.mealAddText}>CHỌN MÓN ĂN</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BỮA TRƯA</Text>
          <View style={styles.mealCardShadow}>
            <View style={styles.mealCard}> 
              {meals.lunch ? (
                <View>
                  <Text style={{ fontWeight: '900', color: '#3C2C21' }}>{meals.lunch.title}</Text>
                  <Text style={{ color: '#8D8074', marginTop: 4 }}>{meals.lunch.desc}</Text>
                </View>
              ) : (
                <View style={styles.mealAdd}> 
                  <Ionicons name="add-circle-outline" size={40} color="#D1CBC6" />
                  <Text style={styles.mealAddText}>CHỌN MÓN ĂN</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BỮA TỐI</Text>
          <View style={styles.mealCardShadow}>
            <View style={styles.mealCard}> 
              {meals.dinner ? (
                <View>
                  <Text style={{ fontWeight: '900', color: '#3C2C21' }}>{meals.dinner.title}</Text>
                  <Text style={{ color: '#8D8074', marginTop: 4 }}>{meals.dinner.desc}</Text>
                </View>
              ) : (
                <View style={styles.mealAdd}> 
                  <Ionicons name="add-circle-outline" size={40} color="#D1CBC6" />
                  <Text style={styles.mealAddText}>CHỌN MÓN ĂN</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={{ height: 96 }} />
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
  mealCard: { backgroundColor: '#FFFFFF', borderRadius: 16, height: 124, padding: 12 },
  mealAdd: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mealAddText: { marginTop: 8, color: '#C8C3BE', fontWeight: '800', fontSize: 12 },
});


