import { Platform } from 'react-native';

// Import expo-notifications - nếu có lỗi bundling, sẽ được bắt ở runtime
import * as Notifications from 'expo-notifications';

/**
 * Đảm bảo có quyền push notifications
 * Trên Expo Go SDK 53+, remote notifications không được hỗ trợ trên Android
 * @returns {Promise<boolean>} true nếu có quyền, false nếu không
 */
export async function ensurePushPermission() {
  if (!Notifications) {
    return false;
  }
  
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      status = asked;
    }
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch (channelError) {
        // Trên Expo Go SDK 53+, có thể lỗi ở đây - không log để giảm noise
        // console.warn('[Notifications] Không thể tạo notification channel (có thể đang chạy trên Expo Go):', channelError.message);
      }
    }
    return status === 'granted';
  } catch (error) {
    // Bắt lỗi từ Expo Go SDK 53+ về remote notifications
    const errorMsg = error?.message || '';
    // Không log warning nếu là lỗi từ Expo Go SDK 53+ (đã có warning từ module)
    if (!errorMsg.includes('removed from Expo Go') && !errorMsg.includes('development build')) {
      // Chỉ log nếu không phải lỗi thông thường từ Expo Go
      // console.warn('[Notifications] Lỗi khi request permissions:', errorMsg);
    }
    return false;
  }
}

/**
 * Gửi local notification ngay lập tức
 * @param {Object} params - Tham số notification
 * @param {string} params.title - Tiêu đề
 * @param {string} params.body - Nội dung
 * @param {Object} [params.data] - Dữ liệu kèm theo
 */
export async function pushLocalNotification({ title, body, data }) {
  if (!Notifications) {
    return;
  }
  
  try {
    const ok = await ensurePushPermission();
    if (!ok) {
      // Không log để giảm noise trên Expo Go
      // console.warn('[Notifications] Không có quyền gửi notification');
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null, // immediate
    });
  } catch (error) {
    // Bắt lỗi từ Expo Go SDK 53+ về remote notifications
    const errorMsg = error?.message || '';
    // Không log warning nếu là lỗi từ Expo Go SDK 53+ (đã có warning từ module)
    // Chỉ log nếu là lỗi khác và không phải lỗi thông thường
    if (!errorMsg.includes('removed from Expo Go') && !errorMsg.includes('development build')) {
      // console.warn('[Notifications] Lỗi khi gửi notification:', errorMsg);
    }
    // Không throw error để app không bị crash
  }
}


