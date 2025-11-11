import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMealById } from '../api/meals';

export default function DetailsMealScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { mealId, meal: passedMeal } = route.params || {};
  const [meal, setMeal] = React.useState(null);
  const [loading, setLoading] = React.useState(!!mealId || !passedMeal);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setError(null);
      // Ưu tiên fetch từ API để có đủ nguyên liệu + bước nấu
      if (mealId) {
        setLoading(true);
        try {
          const data = await getMealById(mealId);
          if (mounted) setMeal(data || passedMeal || null);
        } catch (e) {
          if (mounted) {
            // Nếu lỗi API, fallback về passedMeal để vẫn hiển thị
            setMeal(passedMeal || null);
            setError(e?.message || 'Đã xảy ra lỗi');
          }
        } finally {
          if (mounted) setLoading(false);
        }
      } else {
        // Không có id, dùng dữ liệu truyền vào
        setMeal(passedMeal || null);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [mealId, passedMeal]);

  const title = meal?.title || 'Công thức';
  const timeText = meal?.time || '15 phút';
  const ingredients = meal?.mealIngredients || [];
  const instructions = meal?.instructions || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#3C2C21" />
        </TouchableOpacity>
      </View>

      {/* Rounded separator to start the content panel */}
      <View style={styles.topSeparator} />

      <ScrollView style={styles.contentScroller} contentContainerStyle={styles.contentWrap}>
        {/* Title & time */}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.timeChip}>
          <Ionicons name="time-outline" size={14} color="#6E5E54" style={{ marginRight: 6 }} />
          <Text style={styles.timeText}>{timeText}</Text>
        </View>

        {/* Loading / Error */}
        {loading && (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <ActivityIndicator size="large" color="#FAE2AF" />
            <Text style={{ marginTop: 10, color: '#7D6E62' }}>Đang tải công thức...</Text>
          </View>
        )}
        {!!error && !loading && (
          <Text style={{ marginTop: 16, color: '#B00020' }}>{error}</Text>
        )}

        {/* Ingredients */}
        {!loading && (
          <>
            <Text style={styles.sectionTitle}>Nguyên liệu</Text>
            {ingredients.length === 0 ? (
              <Text style={styles.emptyLine}>Chưa có dữ liệu nguyên liệu</Text>
            ) : (
              <View style={{ marginTop: 6 }}>
                {ingredients.map((ing, idx) => (
                  <View key={`${ing}-${idx}`} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.lineText}>{ing}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Instructions */}
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Cách chế biến</Text>
            {instructions.length === 0 ? (
              <Text style={styles.emptyLine}>Chưa có hướng dẫn</Text>
            ) : (
              <View style={{ marginTop: 6 }}>
                {instructions.map((step, idx) => (
                  <View key={`step-${idx}`} style={styles.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.lineText}>{typeof step === 'string' ? step : step?.text || ''}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { height: 130, backgroundColor: '#EFD493', justifyContent: 'center' },
  backBtn: { paddingHorizontal: 16 },
  topSeparator: { height: 16, backgroundColor: '#F3F1F6', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  contentScroller: { flex: 1, backgroundColor: '#F3F1F6' },
  contentWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 44, backgroundColor: '#F3F1F6', flexGrow: 1 },
  title: { color: '#3C2C21', fontWeight: '900', fontSize: 24, lineHeight: 28, textTransform: 'uppercase' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  timeChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E0DA', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  timeText: { color: '#6E5E54', fontWeight: '800' },
  sectionTitle: { marginTop: 22, color: '#3C2C21', fontWeight: '900', fontSize: 18 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#B5AAA2', marginTop: 9, marginRight: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FAE2AF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepBadgeText: { color: '#3C2C21', fontWeight: '900', fontSize: 12, lineHeight: 12 },
  lineText: { color: '#5E5046', flex: 1, lineHeight: 24 },
  emptyLine: { color: '#9A8A7B', marginTop: 6 },
});


