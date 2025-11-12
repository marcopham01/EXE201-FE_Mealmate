import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeIngredientsFromImage } from '../api/meals';
import { getProfile } from '../api/auth';

export default function AnalyzingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { uri, note } = route.params || {};
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Hàm phân tích ảnh - sử dụng useCallback để có thể gọi lại
  const analyzeImage = useCallback(async () => {
    try {
      if (!uri) {
        throw new Error('Không có ảnh để phân tích');
      }

      setError(null); // Reset error khi bắt đầu phân tích

      // Lấy thông tin user từ AsyncStorage (BMI profile)
      let userId = null;
      let heightCm = null;
      let weightKg = null;
      let bmi = null;

      try {
        // Lấy userId từ profile
        const profileRes = await getProfile();
        userId = profileRes?.user?._id || profileRes?._id || profileRes?.user?.id || profileRes?.id;
        
        // Lấy thông tin BMI từ AsyncStorage
        const bmiProfileRaw = await AsyncStorage.getItem('userProfileBMI');
        if (bmiProfileRaw) {
          const bmiProfile = JSON.parse(bmiProfileRaw);
          heightCm = bmiProfile.height ? Number(bmiProfile.height) : null;
          weightKg = bmiProfile.weight ? Number(bmiProfile.weight) : null;
          bmi = bmiProfile.bmi ? Number(bmiProfile.bmi) : null;
        }
      } catch (profileError) {
        console.warn('[AnalyzingScreen] Error getting user profile:', profileError);
        // Tiếp tục gọi API dù không có thông tin user
      }

      console.log('[AnalyzingScreen] Calling AI API with params:', {
        uri,
        userId,
        heightCm,
        weightKg,
        bmi,
      });

      // Gọi API phân tích ảnh
      const result = await analyzeIngredientsFromImage({
        imageUri: uri,
        userId,
        heightCm,
        weightKg,
        bmi,
      });

      console.log('[AnalyzingScreen] AI API result:', result);

      // Xử lý kết quả và navigate đến màn hình kết quả
      // Backend trả về: { ingredientsDetected, matchedIngredients, meals, note }
      if (result) {
        navigation.replace('AnalyzeResult', {
          uri,
          note,
          ingredientsDetected: result.ingredientsDetected || [], // Tên nguyên liệu thô từ Gemini
          matchedIngredients: result.matchedIngredients || [], // Ingredient objects đã match trong DB
          meals: result.meals || [], // Danh sách món ăn gợi ý
          apiNote: result.note || null, // Note từ API (nếu có)
          rawResult: result, // Lưu raw result để xử lý sau
        });
      } else {
        throw new Error('Không nhận được kết quả từ AI');
      }
    } catch (err) {
      console.error('[AnalyzingScreen] Error analyzing image:', err);
      const errorMessage = err.message || 'Có lỗi xảy ra khi phân tích ảnh';
      setError(errorMessage);
      
      // Hiển thị alert và cho phép người dùng thử lại hoặc quay lại
      Alert.alert(
        'Lỗi phân tích ảnh',
        errorMessage,
        [
          {
            text: 'Thử lại',
            onPress: () => {
              setRetryCount(prev => prev + 1);
              analyzeImage();
            },
          },
          {
            text: 'Quay lại',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [uri, note, navigation]);

  useEffect(() => {
    // Gọi hàm phân tích khi component mount hoặc khi retry
    analyzeImage();
  }, [analyzeImage, retryCount]);

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


