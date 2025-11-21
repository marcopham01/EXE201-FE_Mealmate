import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Animated } from 'react-native';
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
  
  // Animation cho header height khi scroll
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const HEADER_MAX_HEIGHT = 250;
  const HEADER_MIN_HEIGHT = 100;
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

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
  const totalKcal = meal?.totalKcal || 0;
  const rating = meal?.rating || 0;

  // Tính toán header height dựa trên scroll position
  // Sử dụng scrollY trực tiếp để giảm độ trễ và rung
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header với animation */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        {/* Meal image from database */}
        {meal?.image && (
          <Image 
            source={{ uri: meal.image }} 
            style={styles.headerImage}
            resizeMode="cover"
          />
        )}
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Rounded separator to start the content panel */}
      <View style={styles.topSeparator} />

      <Animated.ScrollView 
        style={styles.contentScroller} 
        contentContainerStyle={styles.contentWrap}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: false
          }
        )}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="auto"
        decelerationRate={0.998}
        contentInsetAdjustmentBehavior="automatic"
        scrollEnabled={true}
      >
        {/* Title & metadata */}
        <Text style={styles.title}>{title}</Text>
        
        {/* Metadata row: time, calories, rating */}
        <View style={styles.metadataRow}>
          <View style={[styles.metadataChip, { marginRight: 8 }]}>
            <Ionicons name="time-outline" size={14} color="#6E5E54" style={{ marginRight: 6 }} />
            <Text style={styles.metadataText}>{timeText}</Text>
          </View>
          
          {totalKcal > 0 && (
            <View style={[styles.metadataChip, { marginRight: 8 }]}>
              <Ionicons name="flame-outline" size={14} color="#F2C763" style={{ marginRight: 6 }} />
              <Text style={styles.metadataText}>{Math.round(totalKcal)} Cal</Text>
            </View>
          )}
          
          {rating > 0 && (
            <View style={styles.metadataChip}>
              <Ionicons name="star" size={14} color="#F2C763" style={{ marginRight: 6 }} />
              <Text style={styles.metadataText}>{rating.toFixed(1)}</Text>
            </View>
          )}
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
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#EFD493', position: 'relative', overflow: 'hidden' },
  headerImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 20, padding: 8 },
  topSeparator: { height: 16, backgroundColor: '#F3F1F6', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  contentScroller: { flex: 1, backgroundColor: '#F3F1F6' },
  contentWrap: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120, backgroundColor: '#F3F1F6' },
  title: { color: '#3C2C21', fontWeight: '900', fontSize: 26, lineHeight: 32, textTransform: 'uppercase', letterSpacing: 0.5 },
  metadataRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, flexWrap: 'wrap' },
  metadataChip: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E6E0DA', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  metadataText: { color: '#6E5E54', fontWeight: '800', fontSize: 13 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  timeChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6E0DA', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  timeText: { color: '#6E5E54', fontWeight: '800' },
  sectionTitle: { marginTop: 28, color: '#3C2C21', fontWeight: '900', fontSize: 20, letterSpacing: 0.3 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, paddingVertical: 4 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F2C763', marginTop: 10, marginRight: 14, shadowColor: '#F2C763', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, paddingVertical: 6 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FAE2AF', alignItems: 'center', justifyContent: 'center', marginRight: 14, shadowColor: '#F2C763', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  stepBadgeText: { color: '#3C2C21', fontWeight: '900', fontSize: 13, lineHeight: 13 },
  lineText: { color: '#5E5046', flex: 1, lineHeight: 26, fontSize: 15, fontWeight: '500' },
  emptyLine: { color: '#9A8A7B', marginTop: 8, fontSize: 14, fontStyle: 'italic' },
});


