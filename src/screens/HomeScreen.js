import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Pressable, Animated, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  // Tính toán tuần hiện tại dựa trên ngày hôm nay (Thứ 2..CN)
  const today = new Date();
  const dayIndexMon0 = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const monday = new Date(today);
  monday.setHours(0,0,0,0);
  monday.setDate(today.getDate() - dayIndexMon0);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const weekLabels = ['T2','T3','T4','T5','T6','T7','CN'];

  const scale = React.useRef(new Animated.Value(1)).current;

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <Image source={require('../../assets/images/LogoEXE.jpg')} style={styles.brandLogo} resizeMode="contain" />
          {/* <View style={styles.brandTextWrap}>
            <Text style={styles.brandTitle}>MealMate</Text>
            <Text style={styles.brandSub}>Plan, prep, and plate</Text>
          </View> */}
        </View>
        <Pressable
          onPressIn={() => animateTo(1.05)}
          onPressOut={() => animateTo(1)}
          onHoverIn={() => animateTo(1.05)}
          onHoverOut={() => animateTo(1)}
          accessibilityRole="button"
        >
          <Animated.View style={[styles.premiumBtn, styles.premiumShadow, { transform: [{ scale }] }]}>
            <MaterialCommunityIcons name="crown" size={18} color="#5A3E2B" />
            <Text style={styles.premiumText}>Gói cao cấp</Text>
          </Animated.View>
        </Pressable>
      </View>

      {/* Weekly strip */}
      <View style={styles.weekStrip}>
        {weekLabels.map((lbl, i) => {
          const isActive = i === dayIndexMon0;
          const dateNumber = weekDates[i].getDate();
          return (
            <View key={lbl} style={styles.dayItem}>
              <Text style={styles.dayLabel}>{lbl}</Text>
              <View style={[styles.dayBadge, isActive && styles.dayBadgeActive]}>
                <Text style={[styles.dayNum, isActive && styles.dayNumActive]}>{dateNumber}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Section header */}
      <View style={styles.sectionDate}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={18} color="#5A5A5A" />
        <Text style={styles.sectionDateText}>
          {`Bữa ăn vào ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`}
        </Text>
      </View>

      {/* Meal blocks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BỮA SÁNG</Text>
        <View style={styles.mealCardShadow}>
          <View style={styles.mealCard}> 
            <View style={styles.mealAdd}> 
              <Ionicons name="add-circle-outline" size={36} color="#D6D1CD" />
              <Text style={styles.mealAddText}>CHỌN MÓN ĂN</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BỮA TRƯA</Text>
        <View style={styles.mealCardShadow}>
          <View style={styles.mealCard}> 
            <View style={styles.mealAdd}> 
              <Ionicons name="add-circle-outline" size={36} color="#D6D1CD" />
              <Text style={styles.mealAddText}>CHỌN MÓN ĂN</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Spacer for bottom bar */}
      <View style={{ height: 96 }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFECF3',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 100,
    height: 100,
    marginRight: 8,
  },
  // brandTextWrap: {
  //   flexDirection: 'column',
  // },
  // brandTitle: {
  //   fontSize: 12,
  //   fontWeight: '700',
  //   color: '#3C2C21',
  // },
  // brandSub: {
  //   fontSize: 8,
  //   color: '#9C8F86',
  // },
  premiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6E0A8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 8,
  },
  premiumShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  premiumText: {
    color: '#4D3B2C',
    fontWeight: '700',
    fontSize: 13,
  },
  weekStrip: {
    backgroundColor: '#EFECF3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  dayItem: { alignItems: 'center' },
  dayLabel: { fontSize: 12, color: '#9B9B9B', marginBottom: 4 },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 16, color: '#2E2E2E' },
  dayBadgeActive: { backgroundColor: '#F1D590' },
  dayNumActive: { color: '#3C2C21', fontWeight: '700' },

  sectionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFECF3',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionDateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C2C21',
  },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#4D3B2C', marginBottom: 10 },
  mealCardShadow: {
    borderRadius: 14,
    backgroundColor: '#0000',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 120,
    padding: 12,
  },
  mealAdd: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealAddText: {
    marginTop: 8,
    color: '#C8C3BE',
    fontWeight: '700',
    fontSize: 12,
  },
});


