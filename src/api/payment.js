import { BASE_URL } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hàm helper để lấy auth headers
async function authHeaders(optionalToken) {
  const token = optionalToken || (await AsyncStorage.getItem('accessToken'));
  if (!token) throw new Error('Chưa đăng nhập');
  return { 'Authorization': `Bearer ${token}` };
}

// Hàm helper để parse response JSON
async function parseResponse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

/**
 * Tạo đơn thanh toán premium (PayOS)
 * @param {Object} params - Tham số tạo đơn
 * @param {string} params.premiumPackageType - Loại gói: "monthly" hoặc "yearly"
 * @param {number} [params.amount] - Số tiền (tùy chọn, backend có thể tự tính)
 * @returns {Promise<Object>} Response chứa payment_id, order_code, checkout_url, qr_code, etc.
 */
export async function createPaymentLink({ premiumPackageType, amount = 0 }) {
  const headers = await authHeaders();
  const res = await fetch(`${BASE_URL}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      amount: amount,
      premium_package_type: premiumPackageType,
    }),
  });
  return await parseResponse(res);
}

/**
 * Lấy lịch sử giao dịch premium của user hiện tại
 * @param {Object} [options] - Tùy chọn query
 * @param {number} [options.page=1] - Trang hiện tại
 * @param {number} [options.limit=10] - Số lượng mỗi trang
 * @param {string} [options.status] - Lọc theo status: "pending", "paid", "cancelled", "failed"
 * @param {string} [optionalToken] - Token tùy chọn (nếu không dùng token từ AsyncStorage)
 * @returns {Promise<Object>} Response chứa data array và pagination info
 */
export async function getPaymentHistory(options = {}, optionalToken) {
  const headers = await authHeaders(optionalToken);
  const { page = 1, limit = 10, status } = options;
  
  // Xây dựng query params
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (status) {
    params.append('status', status);
  }
  // Thêm timestamp để tránh cache
  params.append('_ts', String(Date.now()));
  
  const url = `${BASE_URL}/payment/history?${params.toString()}`;
  const commonHeaders = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...headers,
  };
  
  let res = await fetch(url, { headers: commonHeaders });
  // Nếu server trả 304 (Not Modified), thử lại với timestamp khác
  if (res.status === 304) {
    params.set('_ts', String(Date.now() + 1));
    res = await fetch(`${BASE_URL}/payment/history?${params.toString()}`, { headers: commonHeaders });
  }
  
  return await parseResponse(res);
}

/**
 * Cập nhật trạng thái thanh toán
 * @param {Object} params - Tham số cập nhật
 * @param {number} params.orderCode - Mã đơn hàng
 * @param {string} params.status - Trạng thái: "pending", "paid", "cancelled", "failed"
 * @param {string} [optionalToken] - Token tùy chọn
 * @returns {Promise<Object>} Response chứa payment info đã cập nhật
 */
export async function updatePaymentStatus({ orderCode, status }, optionalToken) {
  const headers = await authHeaders(optionalToken);
  const res = await fetch(`${BASE_URL}/payment/update-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      order_code: orderCode,
      status: status,
    }),
  });
  return await parseResponse(res);
}

/**
 * Kiểm tra trạng thái thanh toán bằng cách query lịch sử giao dịch
 * @param {Object} params - Tham số kiểm tra
 * @param {number} params.orderCode - Mã đơn hàng cần kiểm tra
 * @param {string} [optionalToken] - Token tùy chọn
 * @returns {Promise<Object|null>} Payment info nếu tìm thấy, null nếu không
 */
export async function verifyPayment({ orderCode }, optionalToken) {
  try {
    // Lấy lịch sử giao dịch và tìm order_code tương ứng
    const history = await getPaymentHistory({ limit: 50 }, optionalToken);
    
    // Hỗ trợ nhiều cấu trúc response khác nhau
    const itemsRaw = history?.data || history?.items || history?.results || 
                     history?.data?.items || history?.data?.results || 
                     history?.data?.data || history?.transactions || 
                     history?.data?.transactions || history?.docs || 
                     history?.data?.docs || [];
    
    const items = Array.isArray(itemsRaw) ? itemsRaw : [];
    
    // Tìm payment theo order_code
    const found = items.find((item) => {
      const code = item?.order_code || item?.orderCode;
      return String(code) === String(orderCode);
    });
    
    if (found) {
      return found;
    }
    
    return null;
  } catch (error) {
    console.warn('[verifyPayment] Error:', error.message);
    throw error;
  }
}

/**
 * Helper function để normalize trạng thái paid
 * @param {Object} payment - Payment object
 * @returns {boolean} true nếu đã paid
 */
export function normalizeIsPaid(payment) {
  if (!payment) return false;
  
  // Kiểm tra các trường status có thể có
  const candidates = [
    payment.status,
    payment.payment_status,
    payment.state,
    payment.transaction_status,
    payment.status_text,
  ];
  
  const joined = candidates
    .map((v) => (typeof v === 'string' ? v.toLowerCase() : ''))
    .join('|');
  
  // Kiểm tra các từ khóa paid
  if (
    joined.includes('paid') ||
    joined.includes('success') ||
    joined.includes('succeeded') ||
    joined.includes('completed') ||
    joined.includes('complete')
  ) {
    return true;
  }
  
  // Kiểm tra boolean flags
  if (payment.is_paid === true || payment.paid === true) {
    return true;
  }
  
  // Kiểm tra numeric status (1 = paid)
  if (String(payment.status) === '1' || String(payment.payment_status) === '1') {
    return true;
  }
  
  return false;
}