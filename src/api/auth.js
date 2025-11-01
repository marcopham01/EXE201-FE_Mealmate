import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Chỉnh PORT theo BE của bạn (mặc định Express 3000)
const PORT = 3000;

// Android emulator dùng 10.0.2.2, iOS simulator dùng localhost; thiết bị thật dùng LAN IP
const ANDROID_EMULATOR_HOST = '10.0.2.2';
const IOS_SIMULATOR_HOST = 'localhost';
// Nếu build lên thiết bị thật, thay LAN_IP bên dưới hoặc lấy từ env/app.json
const LAN_IP = '192.168.1.50';

// Cho phép override qua biến môi trường (Expo) để trỏ đúng BE đang chạy/đã xác nhận
// Ví dụ: EXPO_PUBLIC_API_BASE="http://192.168.1.123:3000/api"
const ENV_BASE = process.env?.EXPO_PUBLIC_API_BASE;

const host = Platform.select({
  android: ANDROID_EMULATOR_HOST,
  ios: IOS_SIMULATOR_HOST,
  default: IOS_SIMULATOR_HOST,
});

export const BASE_URL = ENV_BASE || `http://${host}:${PORT}/api`;

async function handleJson(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export async function login(payload) {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

export async function register(payload) {
  const res = await fetch(`${BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

export async function getProfile() {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) throw new Error('Missing access token');
  const res = await fetch(`${BASE_URL}/users/getprofile`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return handleJson(res);
}


export async function deleteAccount() {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) throw new Error('Missing access token');
  const url = `${BASE_URL}/users/delete`;
  // Thử DELETE trước
  let res = await fetch(url, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  if (res.status === 404) {
    // Fallback: một số proxy/BE cũ chưa map DELETE → thử POST
    res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
  }
  return handleJson(res);
}


