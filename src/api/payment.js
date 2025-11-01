import { BASE_URL } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function authHeaders(optionalToken) {
  const token = optionalToken || (await AsyncStorage.getItem('accessToken'));
  if (!token) throw new Error('Chưa đăng nhập');
  return { 'Authorization': `Bearer ${token}` };
}

export async function createPaymentLink({ premiumPackageType }) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/payment/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ premium_package_type: premiumPackageType }),
  });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export async function getPaymentHistory(optionalToken) {
  const headers = await authHeaders(optionalToken);
  // Thêm tham số chống cache để tránh 304/If-None-Match
  const ts = Date.now();
  const base = `${BASE_URL}/payment/history`;
  const url = `${base}?limit=50&_ts=${ts}`; // lấy nhiều hơn đề phòng phân trang chưa tới
  const commonHeaders = { 'Cache-Control': 'no-cache', Pragma: 'no-cache', ...headers };

  let res = await fetch(url, { headers: commonHeaders });
  // Nếu server vẫn trả 304 do ETag, thử lại 1 lần với ts khác
  if (res.status === 304) {
    res = await fetch(`${base}?limit=50&_ts=${Date.now() + 1}`, { headers: commonHeaders });
  }
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data; // paginated response
}

export async function verifyPayment({ orderCode }, optionalToken) {
  const headers = await authHeaders(optionalToken);
  const commonHeaders = { 'Cache-Control': 'no-cache', Pragma: 'no-cache', ...headers };

  const normalizeIsPaid = (r) => {
    if (!r) return false;
    const candidates = [r.status, r.payment_status, r.state, r.transaction_status, r.status_text];
    const joined = candidates.map((v) => (typeof v === 'string' ? v.toLowerCase() : '')).join('|');
    if (
      joined.includes('paid') ||
      joined.includes('success') ||
      joined.includes('succeeded') ||
      joined.includes('completed') ||
      joined.includes('complete')
    ) return true;
    if (r.is_paid === true || r.paid === true) return true;
    if (`${r.status}` === '1' || `${r.payment_status}` === '1') return true;
    return false;
  };

  // 1) Thử endpoint verify
  try {
    const ts1 = Date.now();
    const base1 = `${BASE_URL}/payment/verify`;
    const q1 = new URLSearchParams({ order_code: String(orderCode || ''), orderCode: String(orderCode || ''), _ts: String(ts1) });
    let res1 = await fetch(`${base1}?${q1.toString()}`, { method: 'GET', headers: commonHeaders });
    if (res1.status === 304) {
      const q1b = new URLSearchParams({ order_code: String(orderCode || ''), orderCode: String(orderCode || ''), _ts: String(Date.now() + 1) });
      res1 = await fetch(`${base1}?${q1b.toString()}`, { method: 'GET', headers: commonHeaders });
    }
    const t1 = await res1.text();
    let d1 = null; try { d1 = t1 ? JSON.parse(t1) : null; } catch {}
    if (res1.ok) {
      // Nếu đã paid thì trả luôn, nếu chưa thì tiếp tục thử endpoint success
      if (normalizeIsPaid(d1)) return d1;
    }
  } catch (_) { /* ignore and fallback */ }

  // 2) Fallback: endpoint success như log BE cung cấp
  const ts2 = Date.now();
  const base2 = `${BASE_URL}/payment/success`;
  const q2 = new URLSearchParams({ order_code: String(orderCode || ''), orderCode: String(orderCode || ''), cancel: 'false', _ts: String(ts2) });
  let res2 = await fetch(`${base2}?${q2.toString()}`, { method: 'GET', headers: commonHeaders });
  if (res2.status === 304) {
    const q2b = new URLSearchParams({ order_code: String(orderCode || ''), orderCode: String(orderCode || ''), cancel: 'false', _ts: String(Date.now() + 1) });
    res2 = await fetch(`${base2}?${q2b.toString()}`, { method: 'GET', headers: commonHeaders });
  }
  const t2 = await res2.text();
  let d2 = null; try { d2 = t2 ? JSON.parse(t2) : null; } catch {}
  if (!res2.ok) {
    const message = (d2 && (d2.message || d2.error)) || `HTTP ${res2.status}`;
    throw new Error(message);
  }
  return d2; // kỳ vọng chứa status=PAID khi thành công
}