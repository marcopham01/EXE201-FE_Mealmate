import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ConfirmPhotoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { uri } = route.params || {};
  const [note, setNote] = useState('');

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
            {uri ? (
              <Image source={{ uri }} style={styles.previewImg} resizeMode="cover" />
            ) : (
              <View style={styles.previewPlaceholder} />
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
    aspectRatio: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#EFD79F',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  previewImg: { 
    width: '100%', 
    height: '100%',
  },
  previewPlaceholder: { flex: 1, backgroundColor: '#EFD79F' },
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
