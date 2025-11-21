import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeIngredientsFromImage } from '../api/meals';
import { getProfile } from '../api/auth';

export default function AnalyzingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { uri, note } = route.params || {};
  const [error, setError] = useState(null);
  const [errorData, setErrorData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);

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
      console.log('[AnalyzingScreen] Error details:', {
        status: err.status,
        limitReached: err.limitReached,
        errorData: err.errorData,
        message: err.message
      });
      
      // Parse error message để lấy thông tin limitReached
      let errorData = null;
      let limitReached = false;
      let errorMessage = err.message || 'Có lỗi xảy ra khi phân tích ảnh';
      
      // Ưu tiên: Kiểm tra error object properties trước
      if (err.status === 403 && err.limitReached) {
        errorData = err.errorData;
        limitReached = true;
        errorMessage = errorData?.message || errorMessage;
        console.log('[AnalyzingScreen] Found limitReached in error object');
      } else {
        // Fallback: Parse từ error message (có thể là string JSON)
        try {
          // Tìm JSON trong error message (sau "HTTP 403: {...}")
          const jsonMatch = err.message?.match(/\{.*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('[AnalyzingScreen] Parsed from message:', parsed);
            if (parsed.limitReached === true) {
              errorData = parsed;
              limitReached = true;
              errorMessage = parsed.message || errorMessage;
              console.log('[AnalyzingScreen] Found limitReached in parsed message');
            }
          }
        } catch (parseError) {
          console.warn('[AnalyzingScreen] Could not parse error message:', parseError);
        }
      }
      
      setError(errorMessage);
      
      // Kiểm tra nếu là lỗi hết lượt (403 với limitReached)
      if (limitReached) {
        console.log('[AnalyzingScreen] Limit reached detected, showing modal. ErrorData:', errorData);
        setErrorData(errorData);
        // Dùng setTimeout để đảm bảo state được update trước khi render
        setTimeout(() => {
          setShowLimitModal(true);
        }, 100);
        return;
      }
      
      console.log('[AnalyzingScreen] Not limit reached, showing alert');
      
      // Hiển thị alert cho các lỗi khác
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

      {/* Modal hiển thị khi hết lượt */}
      <Modal
        visible={showLimitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowLimitModal(false);
          navigation.goBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={48} color="#F2CF7F" />
              </View>
              <Text style={styles.modalTitle}>Đã hết lượt miễn phí</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Bạn đã sử dụng hết 3 lần phân tích ảnh miễn phí trong ngày hôm nay.
              </Text>
              <Text style={styles.modalSubMessage}>
                Nâng cấp Premium để sử dụng không giới hạn!
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => {
                  setShowLimitModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.btnSecondaryText}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => {
                  setShowLimitModal(false);
                  navigation.navigate('Premium');
                }}
              >
                <Text style={styles.btnPrimaryText}>Nâng cấp Premium</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { marginTop: 12, color: '#6B4E3A', fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF9E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3C2C21',
    textAlign: 'center',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: '#6F5B4A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  modalSubMessage: {
    fontSize: 15,
    color: '#9A8E83',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnSecondary: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F6F4F2',
    borderWidth: 1,
    borderColor: '#E6E0DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6F5B4A',
    textAlign: 'center',
  },
  btnPrimary: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F2CF7F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3C2C21',
    textAlign: 'center',
  },
});


