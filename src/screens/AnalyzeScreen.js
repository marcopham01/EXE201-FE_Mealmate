import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FixedHeader from '../components/FixedHeader';
import WeekStrip from '../components/WeekStrip';
import { useWeek } from '../context/WeekContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePremium } from '../context/PremiumContext';

export default function AnalyzeScreen() {
  const navigation = useNavigation();
  const { premiumActive } = usePremium();
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

  useFocusEffect(React.useCallback(() => {
    const now = new Date();
    const idx = (now.getDay() + 6) % 7;
    setSelectedDayIdx(idx);
  }, [setSelectedDayIdx]));

  return (
    <SafeAreaView style={styles.container}>
      <FixedHeader onPressPremium={premiumActive ? undefined : () => navigation.navigate('Premium')} />
      <WeekStrip weekLabels={weekLabels} weekDates={weekDates} selectedIdx={selectedDayIdx} onChange={setSelectedDayIdx}/>
      <View style={styles.body}>
        <View style={styles.softDivider} />
        {premiumActive ? (
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <Text style={styles.sectionTitle}>Phân tích vào {weekDates[selectedDayIdx].toLocaleDateString('vi-VN')}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Lượng calo</Text>
              <View style={styles.calRow}>
                {/* Vòng tròn duy trì */}
                <View style={styles.ringBox}>
                  <View style={styles.ringOuter}>
                    <View style={styles.ringInner} />
                  </View>
                  <Text style={styles.ringLabel}>Duy trì</Text>
                  <Text style={styles.ringValue}>2409</Text>
                </View>
                {/* Cột tuần */}
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <View style={styles.barRow}>
                    {weekLabels.map((lb, idx) => (
                      <View key={lb} style={styles.barCol}>
                        <View style={[styles.bar, idx === selectedDayIdx && styles.barActive]} />
                        <Text style={[styles.barLabel, idx === selectedDayIdx && styles.barLabelActive]}>{lb}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.overline}> 
                    <Text style={styles.overNum}>0</Text>
                    <Text style={styles.overText}> vượt mức lượng Cal</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons name="crown" size={64} color="#B7AEA5" style={{ marginBottom: 22 }} />
            <Text style={styles.lockTitle}>Mở gói cao cấp để sử dụng tính năng này</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1, backgroundColor: '#F6F4F2' },
  softDivider: { height: 1, backgroundColor: '#EEE9E2', marginHorizontal: 16, opacity: 0.7 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lockTitle: { color: '#958A7B', fontWeight: '800', fontSize: 22, textAlign: 'center', maxWidth: width * 0.87, lineHeight: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#3C2C21' },
  card: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontWeight: '900', color: '#3C2C21', fontSize: 18, marginBottom: 12 },
  calRow: { flexDirection: 'row', alignItems: 'center' },
  ringBox: { width: 120, alignItems: 'center' },
  ringOuter: { width: 100, height: 100, borderRadius: 100, backgroundColor: '#EFECE8', alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 82, height: 82, borderRadius: 82, backgroundColor: '#FFFFFF' },
  ringLabel: { position: 'absolute', top: 26, fontWeight: '900', color: '#6F5B4A' },
  ringValue: { position: 'absolute', top: 46, fontWeight: '900', fontSize: 22, color: '#3C2C21' },
  barRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 22, height: 120, backgroundColor: '#E0DDD9', borderRadius: 8 },
  barActive: { backgroundColor: '#F2D484' },
  barLabel: { marginTop: 6, color: '#9A8E83', fontWeight: '800' },
  barLabelActive: { color: '#3C2C21' },
  overline: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  overNum: { color: '#3C2C21', fontWeight: '900', marginRight: 6 },
  overText: { color: '#6F6760' },
});
