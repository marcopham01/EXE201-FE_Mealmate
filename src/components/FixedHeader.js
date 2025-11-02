import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function FixedHeader({ extraRight, onPressPremium }) {
  const { unreadCount } = useNotifications();
  const navigation = useNavigation();
  
  return (
    <View style={styles.header}>
      <View style={styles.leftBlock}>
        <Image source={require('../../assets/images/MealMate Logo.png')} style={styles.logo} resizeMode="contain" />
        <View>
          <Text style={styles.logoText}>MealMate</Text>
          <Text style={styles.logoSub}>Plan, prep, and plate</Text>
        </View>
      </View>
      <View style={styles.rightBlock}>
        {/* Luôn hiển thị chuông thông báo */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={styles.bellBtn} 
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={18} color="#4D3B2C" />
          {/* Chỉ hiển thị badge khi có thông báo chưa đọc */}
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        {/* Extra right element (nếu có) */}
        {extraRight ? extraRight : null}
        {/* Premium button */}
        {onPressPremium ? (
          <TouchableOpacity activeOpacity={0.88} onPress={onPressPremium}>
            <LinearGradient colors={["#E8D29D", "#F8CF73"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.premiumBtn}>
              <MaterialCommunityIcons name="crown" size={18} color="#5A3E2B" />
              <Text style={styles.premiumText}>Gói cao cấp</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.09, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    zIndex: 10,
  },
  leftBlock: {
    flexDirection: 'row', alignItems: 'center',
  },
  logo: { width: 56, height: 56, marginRight: 10 },
  logoText: { fontSize: 20, fontWeight: '800', color: '#44392B', letterSpacing: 0.3 },
  logoSub: { fontSize: 11, color: '#B6A68C', marginTop: -2 },
  rightBlock: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  premiumBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  premiumText: { color: '#3C2C21', fontWeight: '800', fontSize: 15 },
  bellBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#FFFFFF', 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.10, 
    shadowRadius: 8, 
    shadowOffset: { width: 0, height: 3 }, 
    elevation: 4,
    position: 'relative',
  },
  badge: { 
    position: 'absolute', 
    right: -4, 
    top: -4, 
    minWidth: 18, 
    height: 18, 
    paddingHorizontal: 4, 
    borderRadius: 9, 
    backgroundColor: '#F1CF82', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: '#FFF' 
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#3C2C21' },
});
