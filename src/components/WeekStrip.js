import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function WeekStrip({ weekLabels, weekDates, selectedIdx, onChange }) {
  return (
    <View style={styles.container}>
      {weekLabels.map((lbl, idx) => {
        const isActive = idx === selectedIdx;
        const dateNumber = weekDates[idx].getDate();
        return (
          <TouchableOpacity
            key={lbl}
            style={styles.dayItem}
            onPress={() => onChange(idx)}
            activeOpacity={0.78}
            accessibilityRole="button"
          >
            <Text style={styles.dayLabel}>{lbl}</Text>
            <View style={[styles.dayBadge, isActive && styles.dayBadgeActive]}>
              <Text style={[styles.dayNum, isActive && styles.dayNumActive]}>{dateNumber}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14,
  },
  dayItem: { alignItems: 'center' },
  dayLabel: { fontSize: 13, color: '#9C948A', marginBottom: 6, fontWeight: '700', letterSpacing: 0.2 },
  dayBadge: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E8E2DA', backgroundColor: '#FFFFFF',
  },
  dayNum: { fontSize: 18, color: '#7F7469', fontWeight: '700' },
  dayBadgeActive: {
    backgroundColor: '#FBE6AE', borderColor: '#E7C56A', borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  dayNumActive: { color: '#3C2C21', fontWeight: '900' },
});
