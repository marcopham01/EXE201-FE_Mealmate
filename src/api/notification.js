import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './auth';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, options, { retries = 2, baseDelayMs = 300 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      // Retry on 5xx/520 only
      if (res.status >= 500 || res.status === 520) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
    if (attempt < retries) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn('[noti][retry]', { attempt: attempt + 1, delay });
      await sleep(delay);
    }
  }
  throw lastErr || new Error('Request failed');
}

async function handleJson(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${response.status}`;
    console.warn('[noti][handleJson] Non-OK', { status: response.status, message, bodySample: typeof text === 'string' ? text.slice(0, 200) : null });
    throw new Error(message);
  }
  console.debug('[noti][handleJson] OK', { status: response.status, bodyType: typeof data });
  return data;
}

async function authHeaders() {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) throw new Error('Missing access token');
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };
}

export async function listNotifications({ page = 1, limit = 10, unreadOnly = false } = {}) {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  // Luôn truyền unreadOnly để bám sát spec (cả true/false)
  params.append('unreadOnly', unreadOnly ? 'true' : 'false');
  const url = `${BASE_URL}/noti?${params.toString()}`;
  console.debug('[noti][GET]', { url, page, limit, unreadOnly });
  const res = await fetchWithRetry(url, { method: 'GET', headers });
  console.debug('[noti][GET][resp]', { status: res.status });
  return handleJson(res);
}

export async function markAllNotificationsRead() {
  const headers = await authHeaders();
  const url = `${BASE_URL}/noti/read-all`;
  console.debug('[noti][PATCH all-read]', { url });
  const res = await fetchWithRetry(url, { method: 'PATCH', headers });
  console.debug('[noti][PATCH all-read][resp]', { status: res.status });
  return handleJson(res);
}

export async function markNotificationRead(id) {
  const headers = await authHeaders();
  const url = `${BASE_URL}/noti/${id}/read`;
  console.debug('[noti][PATCH read]', { url, id });
  const res = await fetchWithRetry(url, { method: 'PATCH', headers });
  console.debug('[noti][PATCH read][resp]', { status: res.status });
  return handleJson(res);
}

export async function deleteNotification(id) {
  const headers = await authHeaders();
  const url = `${BASE_URL}/noti/${id}`;
  console.debug('[noti][DELETE]', { url, id });
  const res = await fetchWithRetry(url, { method: 'DELETE', headers });
  console.debug('[noti][DELETE][resp]', { status: res.status });
  return handleJson(res);
}

export async function createWeeklyKcalSummary() {
  const headers = await authHeaders();
  const url = `${BASE_URL}/noti/weekly-kcal`;
  console.debug('[noti][POST weekly-kcal]', { url });
  const res = await fetchWithRetry(url, { method: 'POST', headers });
  console.debug('[noti][POST weekly-kcal][resp]', { status: res.status });
  return handleJson(res);
}


