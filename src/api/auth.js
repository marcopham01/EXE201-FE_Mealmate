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

export const BASE_URL = ENV_BASE || `https://exe-be-v4pd.onrender.com/api`;

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
  return callWithAutoRefresh(async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) throw new Error('Missing access token');
    const res = await fetch(`${BASE_URL}/users/getprofile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleJson(res);
  });
}


export async function refreshTokens() {
  const storedRefresh = await AsyncStorage.getItem('refreshToken');
  if (!storedRefresh) {
    throw new Error('No refresh token available');
  }
  const body = { refreshToken: storedRefresh };
  const res = await fetch(`${BASE_URL}/users/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await handleJson(res);
  if (data?.accessToken) {
    await AsyncStorage.setItem('accessToken', data.accessToken);
  }
  if (data?.refreshToken) {
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
  }
  return data;
}

/**
 * Helper function để tự động refresh token khi gặp 401 error
 * @param {Function} apiCall - Function gọi API cần retry
 * @returns {Promise} Kết quả từ API call
 */
export async function callWithAutoRefresh(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    // Kiểm tra nếu là lỗi 401 (Unauthorized) - token hết hạn
    // Check trong message hoặc status code
    const errorMessage = error.message || '';
    const isUnauthorized = errorMessage.includes('401') || 
                          errorMessage.includes('Unauthorized') ||
                          errorMessage.toLowerCase().includes('token expired') ||
                          errorMessage.toLowerCase().includes('invalid token') ||
                          errorMessage.toLowerCase().includes('missing access token');
    
    if (isUnauthorized) {
      try {
        // Thử refresh token
        await refreshTokens();
        // Retry API call với token mới
        return await apiCall();
      } catch (refreshError) {
        // Nếu refresh token thất bại, xóa tokens và throw error
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    }
    // Nếu không phải lỗi 401, throw error gốc
    throw error;
  }
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


