import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ConfirmPhotoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { uri } = route.params || {};
  const [note, setNote] = useState('');
  const [imageError, setImageError] = useState(false);

  // Debug: Log params
  React.useEffect(() => {
    console.log('[ConfirmPhoto] Route params:', route.params);
    console.log('[ConfirmPhoto] URI:', uri);
    if (!uri) {
      console.warn('[ConfirmPhoto] No URI provided in route params!');
    }
  }, [uri, route.params]);

  // Normalize URI - đảm bảo file:// URI được xử lý đúng
  const imageUri = React.useMemo(() => {
    if (!uri) return null;
    // Nếu URI đã có file:// thì giữ nguyên, nếu không thì thêm
    if (uri.startsWith('file://') || uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    // Nếu là path tương đối, thêm file://
    return `file://${uri}`;
  }, [uri]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.iconBtn}>
          <Ionicons name="close" size={28} color="#9F9892" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Xác nhận ảnh của bạn?</Text>
        <View style={styles.previewContainer}>
          <View style={styles.previewCard}>
            {imageUri ? (
              <Image
                key={imageUri}
                source={{ uri: imageUri }}
                style={styles.previewImg}
                resizeMode="cover"
                fadeDuration={0}
                onError={(e) => {
                  const error = e?.nativeEvent?.error || e;
                  console.error('[ConfirmPhoto] Image load error:', error);
                  console.error('[ConfirmPhoto] Failed URI:', imageUri);
                  console.error('[ConfirmPhoto] Error details:', JSON.stringify(e?.nativeEvent || {}));
                  setImageError(true);
                }}
                onLoad={(e) => {
                  console.log('[ConfirmPhoto] Image loaded successfully:', imageUri);
                  console.log('[ConfirmPhoto] Image dimensions:', {
                    width: e?.nativeEvent?.source?.width,
                    height: e?.nativeEvent?.source?.height,
                  });
                  console.log('[ConfirmPhoto] Image style applied:', styles.previewImg);
                  setImageError(false);
                }}
                onLoadStart={() => {
                  console.log('[ConfirmPhoto] Image loading started:', imageUri);
                  setImageError(false);
                }}
                onLoadEnd={() => {
                  console.log('[ConfirmPhoto] Image load ended:', imageUri);
                }}
              />
            ) : (
              <View style={styles.previewPlaceholder}>
                {imageError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="image-outline" size={48} color="#9F9892" />
                    <Text style={styles.errorText}>Không thể tải ảnh</Text>
                  </View>
                ) : (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Đang tải ảnh...</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.note}
            placeholder="Ghi chú: Khẩu phần, phương pháp nấu ăn"
            placeholderTextColor="#BEB9B4"
            value={note}
            onChangeText={setNote}
            multiline={false}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.navigate('Main', { screen: 'Camera' })}>
            <Text style={styles.btnTextDark}>Làm lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.primary]}
            onPress={() => navigation.navigate('Analyzing', { uri, note })}
          >
            <Text style={styles.btnText}>Xác nhận</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F5F8' },
  topBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#0F0E0D', marginBottom: 14 },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  previewCard: {
    width: width - 48,
    height: width - 48,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImg: { 
    width: width - 48,
    height: width - 48,
    borderRadius: 28,
    backgroundColor: 'transparent',
  },
  previewPlaceholder: { 
    flex: 1, 
    backgroundColor: '#EFD79F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#7D6E62',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#9F9892',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  inputContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  note: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8E7E6',
    paddingHorizontal: 16,
    color: '#3C2C21',
    fontSize: 15,
    borderWidth: 0,
    textAlignVertical: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 28,
    paddingTop: 8,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#FFD37A',
  },
  secondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5C3A2B',
  },
  btnText: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
  },
  btnTextDark: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
  },
});
