import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '../api/auth';

const PremiumContext = React.createContext({ 
  premiumActive: false, 
  setPremiumActive: () => {},
  refreshPremiumStatus: () => {},
});

export function PremiumProvider({ children }) {
  const [premiumActive, setPremiumActiveState] = React.useState(false);

  // Hàm kiểm tra premium status từ server (tối ưu để nhanh hơn)
  // Trả về boolean để biết premium có active không
  const checkPremiumFromServer = React.useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      // Nếu không có token, chắc chắn không phải premium
      if (!token) {
        setPremiumActiveState(false);
        await AsyncStorage.removeItem('premiumActive');
        return false;
      }

      // Fetch profile từ server để lấy trạng thái premium thực tế (không cache để có data mới nhất)
      const profile = await getProfile();
      // Kiểm tra nhiều format response có thể có
      const premiumMembership = profile?.data?.premiumMembership || profile?.user?.premiumMembership || profile?.premiumMembership;
      const premiumMembershipExpires = profile?.data?.premiumMembershipExpires || profile?.user?.premiumMembershipExpires || profile?.premiumMembershipExpires;
      
      // Debug log để kiểm tra
      console.log('[PremiumContext] Profile check:', {
        premiumMembership,
        premiumMembershipExpires,
        hasExpires: !!premiumMembershipExpires,
        profileKeys: Object.keys(profile || {})
      });
      
      // Kiểm tra premium status: phải có premiumMembership = true
      const isActive = premiumMembership === true;
      
      // Nếu không có expires date nhưng premiumMembership = true → coi là lifetime (active)
      // Nếu có expires date → kiểm tra chưa hết hạn
      let notExpired = true; // Mặc định là true nếu không có expires date
      if (premiumMembershipExpires) {
        try {
          const expiresTime = new Date(premiumMembershipExpires).getTime();
          const now = Date.now();
          notExpired = expiresTime > now;
          console.log('[PremiumContext] Expires check:', {
            expiresTime,
            now,
            notExpired,
            expiresDate: new Date(premiumMembershipExpires).toISOString()
          });
        } catch (dateError) {
          console.warn('[PremiumContext] Error parsing expires date:', dateError);
          // Nếu parse date lỗi nhưng premiumMembership = true, vẫn coi là active
          notExpired = true;
        }
      }
      
      const finalStatus = isActive && notExpired;
      console.log('[PremiumContext] Final premium status:', finalStatus);
      setPremiumActiveState(finalStatus);
      // Vẫn lưu vào AsyncStorage để cache, nhưng sẽ được override bởi server check
      await AsyncStorage.setItem('premiumActive', finalStatus ? 'true' : 'false');
      return finalStatus;
    } catch (error) {
      // Nếu lỗi (ví dụ: token hết hạn, không đăng nhập), set premium = false
      const errorMsg = error?.message || '';
      // Chỉ log warning nếu không phải lỗi token thông thường (chưa đăng nhập)
      if (errorMsg && !errorMsg.toLowerCase().includes('invalid token') && !errorMsg.toLowerCase().includes('missing access token')) {
        console.warn('[PremiumContext] Error checking premium status:', errorMsg);
      }
      setPremiumActiveState(false);
      await AsyncStorage.removeItem('premiumActive');
      return false;
    }
  }, []);

  // Kiểm tra premium status khi mount
  React.useEffect(() => {
    checkPremiumFromServer();
  }, [checkPremiumFromServer]);

  // Hàm set premium status (dùng khi user đăng ký premium)
  const setPremiumActive = async (val) => {
    setPremiumActiveState(val);
    await AsyncStorage.setItem('premiumActive', val ? 'true' : 'false');
  };

  // Hàm refresh premium status từ server (export để có thể gọi từ bên ngoài)
  // Trả về Promise để có thể await được
  // Có thể retry nhiều lần nếu cần (sau khi thanh toán)
  const refreshPremiumStatus = React.useCallback(async (options = {}) => {
    const { retries = 0, retryDelay = 2000, maxRetries = 0 } = options;
    
    // Thử check ngay lần đầu và lấy kết quả
    const isActive = await checkPremiumFromServer();
    
    // Nếu premium đã active, không cần retry nữa
    if (isActive) {
      console.log('[PremiumContext] Premium confirmed active, stopping retries');
      return;
    }
    
    // Nếu có yêu cầu retry và chưa đạt max retries và premium chưa active, tiếp tục retry
    if (maxRetries > 0 && retries < maxRetries) {
      console.log(`[PremiumContext] Premium not active yet, retrying... (${retries + 1}/${maxRetries})`);
      // Đợi một chút trước khi retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      // Retry lại
      return await refreshPremiumStatus({ retries: retries + 1, retryDelay, maxRetries });
    }
    
    return;
  }, [checkPremiumFromServer]);

  return (
    <PremiumContext.Provider value={{ premiumActive, setPremiumActive, refreshPremiumStatus }}>
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => React.useContext(PremiumContext);
