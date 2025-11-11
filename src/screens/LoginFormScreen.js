import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushLocalNotification } from '../utils/notifications';
import { usePremium } from '../context/PremiumContext';

export default function LoginFormScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { refreshPremiumStatus } = usePremium();
  const [usernameState, setUsernameState] = React.useState('');
  const [passwordState, setPasswordState] = React.useState('');
  const [errors, setErrors] = React.useState({ username: '', password: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.card}
          keyboardShouldPersistTaps="handled"
        >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <Image source={require('../../assets/images/MealMate Logo.png')} style={styles.logoTop} resizeMode="contain" />
        <Text style={styles.title}>Đăng nhập</Text>
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Chưa có tài khoản?</Text>
          <Text style={styles.signupLink} onPress={() => navigation.navigate('Register')}> Đăng ký ngay</Text>
        </View>

        <Text style={styles.label}>Tên đăng nhập</Text>
        <View style={[styles.inputWrap, errors.username && { borderColor: '#D93025', borderWidth: 1 }] }>
          <Ionicons name="person-outline" size={18} color="#8D8580" />
          <TextInput 
            placeholder="username" 
            style={styles.inputField} 
            value={usernameState} 
            onChangeText={(t)=>{ setUsernameState(t); if (errors.username) setErrors((e)=>({...e, username: ''})); }} 
            autoCapitalize="none"
            autoCorrect={true}
            keyboardType="default"
            returnKeyType="next"
          />
        </View>
        {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={[styles.inputWrap, errors.password && { borderColor: '#D93025', borderWidth: 1 }] }>
          <Ionicons name="lock-closed-outline" size={18} color="#8D8580" />
          <TextInput placeholder="123!@#" secureTextEntry={!showPassword} style={styles.inputField} value={passwordState} onChangeText={(t)=>{ setPasswordState(t); if (errors.password) setErrors((e)=>({...e, password: ''})); }} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#8D8580" />
          </TouchableOpacity>
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            const username = (usernameState || '').trim();
            const password = (passwordState || '').trim();
            let hasErr = false; const nextErr = { username: '', password: '' };
            if (!username) { nextErr.username = 'Vui lòng nhập tên đăng nhập'; hasErr = true; }
            else if (username.length < 3) { nextErr.username = 'Tên đăng nhập phải ≥ 3 ký tự'; hasErr = true; }
            if (!password) { nextErr.password = 'Vui lòng nhập mật khẩu'; hasErr = true; }
            else if (password.length < 6) { nextErr.password = 'Mật khẩu phải ≥ 6 ký tự'; hasErr = true; }
            if (hasErr) { setErrors(nextErr); return; }
            try {
              setSubmitting(true);
              const res = await login({ username, password });
              if (res?.accessToken) {
                await AsyncStorage.setItem('accessToken', res.accessToken);
              }
              if (res?.refreshToken) {
                await AsyncStorage.setItem('refreshToken', res.refreshToken);
              }
              // Refresh premium status từ server sau khi đăng nhập thành công
              refreshPremiumStatus();
              // Thông báo cục bộ (hardcode FE)
              pushLocalNotification({ title: 'Đăng nhập thành công', body: `Chào mừng ${username}!` });
              navigation.replace('Main');
            } catch (e) {
              const msg = (e?.message || '').toLowerCase();
              if (msg.includes('user not found') || msg.includes('password incorect')) {
                alert('Sai tên đăng nhập hoặc mật khẩu');
              } else {
                alert(e.message || 'Đăng nhập thất bại');
              }
            } finally { setSubmitting(false); }
          }}
        >
          <LinearGradient colors={["#E8D29D", "#F8CF73"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}>
            <Text style={styles.primaryText}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFEFF5' },
  card: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
    alignItems: 'stretch',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: -8, alignSelf: 'flex-start' },
  logoTop: { width: 120, height: 120, alignSelf: 'center', marginTop: 8, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: '#1F1F1F', marginTop: 14, textAlign: 'center', letterSpacing: 0.3 },
  signupRow: { flexDirection: 'row', alignSelf: 'center', marginTop: 6 },
  signupText: { color: '#8C8C8C', fontSize: 14 },
  signupLink: { color: '#1B73E8', fontWeight: '800', fontSize: 14 },
  label: { marginTop: 18, marginBottom: 8, color: '#3C3C3C', fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  inputField: { flex: 1, paddingVertical: 10, paddingHorizontal: 2 },
  eyeButton: { padding: 4, justifyContent: 'center', alignItems: 'center' },
  primaryBtn: { paddingVertical: 16, borderRadius: 28, alignItems: 'center', marginTop: 36, width: '100%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  primaryText: { fontWeight: '700', color: '#3C2C21' },
  errorText: { color: '#D16B6B', marginTop: 6, marginLeft: 6, fontSize: 12, fontWeight: '700' },
});


