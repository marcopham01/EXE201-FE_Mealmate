import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAccount } from '../api/auth';

export default function SettingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Quay lại">
          <Ionicons name="arrow-back" size={26} color="#4D3B2C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.section}>
        <TouchableOpacity activeOpacity={0.88} style={styles.item}>
          <View style={styles.itemLeft}>
            <Ionicons name="notifications-outline" size={20} color="#5A3E2B" style={{ width: 22 }} />
            <Text style={styles.itemLabel}>Thông báo</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9C8F86" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} style={styles.item} onPress={() => navigation.navigate('LoginForm') /* tạm thời dẫn đến đổi mật khẩu sau */}>
          <View style={styles.itemLeft}>
            <Ionicons name="lock-closed-outline" size={20} color="#5A3E2B" style={{ width: 22 }} />
            <Text style={styles.itemLabel}>Mật khẩu</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9C8F86" />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.88} style={styles.item}>
          <View style={styles.itemLeft}>
            <MaterialCommunityIcons name="palette-outline" size={20} color="#5A3E2B" style={{ width: 22 }} />
            <Text style={styles.itemLabel}>Chủ đề</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9C8F86" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.item, styles.logoutItem]}
          onPress={async () => {
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('premiumActive');
            navigation.reset({ index: 0, routes: [{ name: 'LoginLanding' }] });
          }}
        >
          <View style={styles.itemLeft}>
            <MaterialCommunityIcons name="logout" size={18} color="#7A2E2E" style={{ width: 22 }} />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.item, styles.dangerItem]}
          onPress={() => {
            Alert.alert(
              'Xóa tài khoản',
              'Hành động này sẽ xóa vĩnh viễn tài khoản và dữ liệu liên quan. Bạn chắc chắn?',
              [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xóa', style: 'destructive', onPress: async () => {
                    try {
                      await deleteAccount();
                      await AsyncStorage.removeItem('accessToken');
                      await AsyncStorage.removeItem('premiumActive');
                      Alert.alert('Đã xóa tài khoản');
                      navigation.reset({ index: 0, routes: [{ name: 'LoginLanding' }] });
                    } catch (e) {
                      Alert.alert('Lỗi', e.message || 'Không xóa được tài khoản');
                    }
                  }
                },
              ]
            );
          }}>
          <View style={styles.itemLeft}>
            <MaterialCommunityIcons name="account-remove-outline" size={18} color="#B3261E" style={{ width: 22 }} />
            <Text style={styles.dangerText}>Xóa tài khoản</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3F7' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '900', color: '#3C2C21' },
  section: { backgroundColor: '#FFFFFF', marginTop: 12, marginHorizontal: 12, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  item: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderRadius: 12 },
  itemLeft: { flexDirection: 'row', alignItems: 'center' },
  itemLabel: { marginLeft: 8, color: '#4D3B2C', fontWeight: '800' },
  logoutItem: { backgroundColor: '#FFF5F5', marginTop: 6 },
  logoutText: { color: '#7A2E2E', fontWeight: '900' },
  dangerItem: { backgroundColor: '#FFF5F5', marginTop: 6 },
  dangerText: { color: '#B3261E', fontWeight: '900' },
});


