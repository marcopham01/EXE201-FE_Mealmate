import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginLandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
      <View style={styles.card}>
        <Image source={require('../../assets/images/MealMate Logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={{ width: '100%', marginTop: 'auto' }}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('LoginForm')}>
            <LinearGradient colors={["#E8D29D", "#F8CF73"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Đăng nhập</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85} onPress={() => {}}>
            <Ionicons name="logo-google" size={20} color="#3C3C3C" style={{ marginRight: 10 }} />
            <Text style={styles.googleText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFEFF5', paddingTop: 24 },
  card: {
    margin: 0,
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  logo: { width: 150, height: 150, marginTop: 60, marginBottom: 60 },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryText: { fontWeight: '700', color: '#3C2C21' },
  googleBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  googleText: { color: '#3C3C3C', fontWeight: '600' },
});


