import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function AnalyzingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { uri, note } = route.params || {};

  useEffect(() => {
    const timer = setTimeout(() => {
      // Giả lập kết quả phân tích với 3-4 gợi ý cho mỗi buổi
      const sampleMeals = {
        breakfast: [
          { id: 'bm_1', title: 'BÁNH MÌ TRỨNG + PATE + RAU', desc: 'Bánh mì, trứng, pate, rau', time: '5 phút' },
          { id: 'bm_2', title: 'BÁNH MÌ ỐP LA + RAU', desc: 'Bánh mì, trứng ốp la, rau', time: '7 phút' },
        ],
        lunch: [
          { id: 'ln_1', title: 'CƠM THỊT KHO + TRỨNG + RAU', desc: 'Thịt ba rọi, trứng, rau', time: '15 phút' },
          { id: 'ln_2', title: 'CƠM GÀ LUỘC + RAU', desc: 'Gà luộc, rau luộc', time: '20 phút' },
        ],
        dinner: [
          { id: 'dn_1', title: 'BÚN THỊT NƯỚNG + RAU', desc: 'Bún, thịt nướng, rau', time: '20 phút' },
          { id: 'dn_2', title: 'CANH RAU + ĐẬU', desc: 'Rau, đậu hũ', time: '12 phút' },
        ],
      };
      navigation.replace('AnalyzeResult', { uri, note, results: sampleMeals });
    }, 1600);
    return () => clearTimeout(timer);
  }, [navigation, uri, note]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F2CF7F" />
        <Text style={styles.text}>Đang phân tích ảnh của bạn...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { marginTop: 12, color: '#6B4E3A', fontWeight: '800' },
});


