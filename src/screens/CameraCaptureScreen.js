import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

export default function CameraCaptureScreen() {
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [mode, setMode] = useState('quick'); // 'quick' hoặc 'library'
  const [facing, setFacing] = useState('back'); // 'back' dùng điện thoại; 'front' dùng webcam/emulator

  useEffect(() => {
    const checkPermissions = async () => {
      if (permission === null) {
        await requestPermission();
      } else if (!permission.granted) {
        if (permission.canAskAgain) {
          Alert.alert('Quyền máy ảnh', 'Cần quyền máy ảnh để chụp hình.', [
            { text: 'Hủy', style: 'cancel', onPress: () => navigation.goBack() },
            { text: 'Mở cài đặt', onPress: () => Linking.openSettings() }
          ]);
        } else {
          Alert.alert('Quyền bị chặn', 'Vào Cài đặt để cấp quyền máy ảnh cho ứng dụng.', [
            { text: 'Đóng', onPress: () => navigation.goBack() },
            { text: 'Mở cài đặt', onPress: () => Linking.openSettings() }
          ]);
        }
      }
    };
    checkPermissions();
  }, [permission, navigation, requestPermission]);

  useEffect(() => {
    if (cameraRef.current) {
      if (!isFocused) {
        cameraRef.current.pausePreview();
      } else if (cameraReady && permission?.granted) {
        cameraRef.current.resumePreview();
      }
    }
  }, [isFocused, cameraReady, permission]);

  const openGallery = async () => {
    setMode('library');
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Quyền bị từ chối', 'Cần quyền thư viện ảnh để chọn hình.');
      setMode('quick');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      navigation.replace('ConfirmPhoto', { uri: result.assets[0].uri });
    } else {
      setMode('quick');
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && cameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (photo?.uri) {
          navigation.replace('ConfirmPhoto', { uri: photo.uri });
        }
      } catch (err) {
        console.warn('Take picture error:', err);
      }
    }
  };

  if (permission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F2CF7F" />
        <Text style={styles.loadingText}>Đang chuẩn bị camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không có quyền camera.</Text>
        <TouchableOpacity style={styles.btnRetry} onPress={() => navigation.goBack()}>
          <Text style={styles.btnRetryText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && permission.granted && (
        <>
          <CameraView
            style={styles.camera}
            facing={facing}
            flash="off"
            ref={cameraRef}
            onCameraReady={() => setCameraReady(true)}
            onMountError={(e) => console.warn('Camera error:', e)}
          />

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#BEB9B4" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setFacing(prev => (prev === 'back' ? 'front' : 'back'))}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.tl} />
            <View style={styles.tr} />
            <View style={styles.bl} />
            <View style={styles.br} />
          </View>

          <TouchableOpacity
            style={styles.capture}
            onPress={takePicture}
            disabled={!cameraReady}
            activeOpacity={0.8}
          >
            <View style={styles.captureOuter}>
              <View style={styles.captureInner} />
            </View>
          </TouchableOpacity>

          <View style={styles.bottomControlBar}>
            <TouchableOpacity
              style={[styles.controlButton, styles.quickButton, mode === 'quick' && styles.activeButton]}
              onPress={() => setMode('quick')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="camera" size={20} color={mode === 'quick' ? '#3C2C21' : '#FFFFFF'} />
              <Text style={[styles.controlButtonText, mode === 'quick' && styles.activeText]}>Chụp nhanh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.libraryButton, mode === 'library' && styles.activeButton]}
              onPress={openGallery}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="image-multiple-outline" size={20} color={mode === 'library' ? '#3C2C21' : '#FFFFFF'} />
              <Text style={[styles.controlButtonText, mode === 'library' && styles.activeText]}>Thư viện</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const size = 52;
const thick = 5;
const radius = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { marginTop: 12, color: '#fff', fontSize: 16 },
  errorText: { color: '#ff6b6b', fontSize: 16, marginBottom: 16 },
  btnRetry: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#F2CF7F', borderRadius: 8 },
  btnRetryText: { color: '#3C2C21', fontWeight: '800' },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: '22%',
    left: 0,
    right: 0,
    bottom: '32%',
    zIndex: 9,
  },
  switchButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
  },
  tl: {
    position: 'absolute',
    left: 32,
    top: 0,
    width: size,
    height: size,
    borderLeftWidth: thick,
    borderTopWidth: thick,
    borderTopLeftRadius: radius,
    borderColor: 'white',
  },
  tr: {
    position: 'absolute',
    right: 32,
    top: 0,
    width: size,
    height: size,
    borderRightWidth: thick,
    borderTopWidth: thick,
    borderTopRightRadius: radius,
    borderColor: 'white',
  },
  bl: {
    position: 'absolute',
    left: 32,
    bottom: 0,
    width: size,
    height: size,
    borderLeftWidth: thick,
    borderBottomWidth: thick,
    borderBottomLeftRadius: radius,
    borderColor: 'white',
  },
  br: {
    position: 'absolute',
    right: 32,
    bottom: 0,
    width: size,
    height: size,
    borderRightWidth: thick,
    borderBottomWidth: thick,
    borderBottomRightRadius: radius,
    borderColor: 'white',
  },
  capture: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    zIndex: 10,
  },
  captureOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8C88F',
  },
  captureInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8C88F',
  },
  bottomControlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#5C4B3F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginHorizontal: 8,
    gap: 8,
  },
  quickButton: {
    backgroundColor: '#E8C88F',
  },
  libraryButton: {
    backgroundColor: '#5C4B3F',
  },
  activeButton: {
    backgroundColor: '#E8C88F',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeText: {
    color: '#3C2C21',
  },
});
