import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'currentUserId';
const subscribers = new Set();

/**
 * Lưu userId hiện tại vào AsyncStorage và phát sự kiện cho subscribers.
 * @param {string|null} userId - UserId mới (null để clear)
 * @param {string|null} oldUserId - UserId cũ (để clear cache của user cũ, nếu không truyền sẽ tự động lấy)
 */
export async function setCurrentUserId(userId, oldUserId = null) {
  try {
    // Nếu không truyền oldUserId, tự động lấy từ storage
    if (oldUserId === null) {
      oldUserId = await getCurrentUserId();
    }
    
    // Nếu đổi user (userId khác oldUserId), clear cache của user cũ
    if (oldUserId && oldUserId !== userId) {
      const { clearMealsCache } = await import('../api/meals');
      clearMealsCache();
      console.log('[userSession] Cleared cache for user change:', { oldUserId, newUserId: userId });
    }
    
    if (userId) {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    } else {
      await AsyncStorage.removeItem(USER_ID_KEY);
      // Clear cache khi logout
      const { clearMealsCache } = await import('../api/meals');
      clearMealsCache();
      console.log('[userSession] Cleared cache on logout');
    }
  } catch (error) {
    console.warn('[userSession] Error storing userId:', error?.message || error);
  } finally {
    subscribers.forEach(callback => {
      try {
        // Truyền cả userId mới và oldUserId vào callback
        callback(userId || null, oldUserId || null);
      } catch (listenerError) {
        console.error('[userSession] subscriber error:', listenerError?.message || listenerError);
      }
    });
  }
}

/**
 * Lấy userId hiện tại từ AsyncStorage.
 * @returns {Promise<string|null>}
 */
export async function getCurrentUserId() {
  try {
    return await AsyncStorage.getItem(USER_ID_KEY);
  } catch (error) {
    console.warn('[userSession] Error reading userId:', error?.message || error);
    return null;
  }
}

/**
 * Đăng ký callback khi userId thay đổi.
 * @param {(userId: string|null) => void} callback
 * @returns {() => void} Hàm hủy đăng ký
 */
export function subscribeToUserIdChanges(callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export const USER_ID_STORAGE_KEY = USER_ID_KEY;

