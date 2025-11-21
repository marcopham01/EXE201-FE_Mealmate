import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { getPaymentHistory, verifyPayment, normalizeIsPaid } from '../api/payment';
import { getProfile } from '../api/auth';
import { usePremium } from '../context/PremiumContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function PaymentWebScreen({ route, navigation }) {
  const { url, orderCode } = route.params || {};
  const { setPremiumActive, refreshPremiumStatus } = usePremium();
  const [checking, setChecking] = React.useState(false);
  const [token, setToken] = React.useState(route.params?.token || null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      // Đảm bảo có token trước khi mở trình duyệt
      let ensuredToken = token;
      if (!ensuredToken) {
        ensuredToken = await AsyncStorage.getItem('accessToken');
        if (ensuredToken) setToken(ensuredToken);
      }
      if (!ensuredToken) {
        Alert.alert('Alert', 'Chưa đăng nhập', [
          { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'LoginLanding' }] }) },
        ]);
        return;
      }
      await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
      checkStatus();
    })();
  }, []);

  // Khi quay lại màn hình (ví dụ đóng trình duyệt), tải lại token đề phòng state bị mất
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      (async () => {
        const tk = await AsyncStorage.getItem('accessToken');
        if (mounted && tk) setToken(tk);
      })();
      return () => { mounted = false; };
    }, [])
  );

  const checkStatus = async () => {
    try {
      setChecking(true);
      const tk = token || (await AsyncStorage.getItem('accessToken'));

      console.log('[PaymentCheck] Start check', { orderCode: String(orderCode) });
      console.log('[PaymentCheck] Token available', { hasToken: !!tk, tokenPreview: tk ? String(tk).slice(0, 8) + '***' : null });

      // Sử dụng normalizeIsPaid từ payment.js

      const delay = (ms) => new Promise((res) => setTimeout(res, ms));

      // 1) Ưu tiên xác thực trực tiếp qua endpoint verify (nếu backend hỗ trợ)
      try {
        if (orderCode) {
          const vr = await verifyPayment({ orderCode }, tk);
          console.log('[PaymentCheck] verifyPayment response', vr);
          if (normalizeIsPaid(vr) || ['paid','success','succeeded','completed','complete'].includes(String(vr?.status).toLowerCase())) {
            // Đợi một chút để backend kịp update
            await delay(1000);
            // Đợi refresh premium status từ server để đảm bảo backend đã update
            await refreshPremiumStatus();
            // Đợi thêm một chút nữa để đảm bảo state được cập nhật
            await delay(500);
            setShowSuccessModal(true);
            return;
          }
        }
      } catch (ve) {
        console.warn('[PaymentCheck] verifyPayment error', { message: ve?.message });
      }

      // 2) Fallback: kiểm tra qua lịch sử giao dịch nhiều lần
      let attempt = 0;
      const maxAttempts = 3;
      let paidOk = false;

      let lastItems = [];
      while (attempt < maxAttempts && !paidOk) {
        console.log('[PaymentCheck] Fetch history attempt', attempt + 1);
        let res = null;
        try {
          res = await getPaymentHistory({ limit: 50 }, tk);
        } catch (err) {
          console.warn('[PaymentCheck] getPaymentHistory error', {
            attempt: attempt + 1,
            message: err?.message,
            name: err?.name,
            status: err?.status,
          });
          attempt += 1;
          if (attempt < maxAttempts) {
            await delay(2000);
            continue;
          } else {
            break;
          }
        }
        // Hỗ trợ nhiều cấu trúc phân trang khác nhau
        let itemsRaw = null;
        const shapes = [
          res?.data,
          res?.items,
          res?.results,
          res?.data?.items,
          res?.data?.results,
          res?.data?.data,
          res?.transactions,
          res?.data?.transactions,
          res?.docs,
          res?.data?.docs,
        ];
        for (const s of shapes) {
          if (Array.isArray(s)) { itemsRaw = s; break; }
        }
        const items = Array.isArray(itemsRaw) ? itemsRaw : [];
        const sample = items.slice(0, 3).map((t) => ({
          order_code: t?.order_code ?? t?.orderCode,
          status: t?.status ?? t?.payment_status ?? t?.state ?? t?.transaction_status,
          paid: t?.paid ?? t?.is_paid,
          premium_package_type: t?.premium_package_type,
        }));
        console.log('[PaymentCheck] attempt', attempt + 1, {
          responseKeys: Object.keys(res || {}),
          itemsLength: items.length,
          samples: sample,
        });
        lastItems = items;
        const found = items.find((t) => `${t?.order_code}` === `${orderCode}`);
        if (found && normalizeIsPaid(found)) {
          console.log('[PaymentCheck] Found paid by orderCode', {
            orderCode: String(orderCode),
            status: found?.status,
            payment_status: found?.payment_status,
            state: found?.state,
          });
          paidOk = true;
          break;
        }
        attempt += 1;
        if (!paidOk && attempt < maxAttempts) {
          await delay(2000);
        }
      }

      // Fallback: nếu không tìm thấy theo orderCode nhưng có bất kỳ giao dịch đã paid gần đây → chấp nhận
      if (!paidOk) {
        const anyPaid = (lastItems || []).some((t) => normalizeIsPaid(t));
        if (anyPaid) paidOk = true;
      }

      if (paidOk) {
        // Đợi một chút để backend kịp update
        await delay(1000);
        // Đợi refresh premium status từ server để đảm bảo backend đã update
        await refreshPremiumStatus();
        // Đợi thêm một chút nữa để đảm bảo state được cập nhật
        await delay(500);
        setShowSuccessModal(true);
        return;
      } else {
        const mapBrief = (lastItems || []).slice(0, 10).map((t) => ({
          code: t?.order_code ?? t?.orderCode,
          status: t?.status ?? t?.payment_status ?? t?.state ?? t?.transaction_status,
        }));
        console.warn('[PaymentCheck] Not found or not paid after verify+history', {
          orderCode: String(orderCode),
          checkedAttempts: attempt,
          lastCount: (lastItems || []).length,
          last10: mapBrief,
        });
        // Kiểm tra trạng thái premium trực tiếp từ hồ sơ người dùng như một biện pháp xác thực cuối
        try {
          const profile = await getProfile();
          const expires = profile?.data?.premiumMembershipExpires || profile?.premiumMembershipExpires;
          const active = (profile?.data?.premiumMembership || profile?.premiumMembership) === true;
          const notExpired = expires ? new Date(expires).getTime() > Date.now() : false;
          console.log('[PaymentCheck] Profile premium', { active, expires });
          if (active && notExpired) {
            // Đợi một chút để backend kịp update
            await delay(1000);
            // Đợi refresh premium status từ server để đảm bảo backend đã update
            await refreshPremiumStatus();
            // Đợi thêm một chút nữa để đảm bảo state được cập nhật
            await delay(500);
            setShowSuccessModal(true);
            return;
          }
        } catch (_) { /* ignore */ }
        alert('Chưa xác nhận thanh toán. Nếu bạn đã thanh toán, vui lòng bấm Kiểm tra lại.');
      }
    } catch (e) {
      if ((e?.message || '').toLowerCase().includes('chưa đăng nhập')) {
        Alert.alert('Alert', 'Chưa đăng nhập', [
          { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'LoginLanding' }] }) },
        ]);
      } else {
        alert(e.message || 'Không kiểm tra được trạng thái thanh toán');
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSuccessModalClose = async () => {
    setShowSuccessModal(false);
    // Đợi thêm một chút để đảm bảo backend đã update hoàn toàn
    await new Promise(resolve => setTimeout(resolve, 500));
    // Refresh lại premium status một lần nữa trước khi navigate
    await refreshPremiumStatus();
    // Navigate tới onboarding để nhập thông tin BMI
    navigation.reset({ index: 0, routes: [{ name: 'OnboardingGoal' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nút back về PremiumScreen */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={24} color="#3C2C21" />
      </TouchableOpacity>
      
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#6B5B4A" />
        <Text style={styles.loadingText}>Đang mở trang thanh toán...</Text>
        <TouchableOpacity 
          onPress={checkStatus} 
          disabled={checking} 
          style={[styles.checkBtn, checking && { opacity: 0.6 }]}
        >
          <Text style={styles.checkText}>
            {checking ? 'Đang kiểm tra...' : 'Tôi đã thanh toán xong - Kiểm tra lại'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal thông báo thanh toán thành công */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#34A853" />
              </View>
              <Text style={styles.modalTitle}>Thanh toán thành công!</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>
                Cảm ơn bạn đã thanh toán. Tài khoản Premium của bạn đã được kích hoạt.
              </Text>
              <Text style={styles.modalSubMessage}>
                Bây giờ bạn có thể sử dụng tất cả các tính năng Premium không giới hạn!
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSuccessModalClose}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Tiếp tục</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF' 
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B5B4A',
    fontSize: 16,
  },
  checkBtn: { 
    marginTop: 20, 
    backgroundColor: '#F1CF82', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 12 
  },
  checkText: { 
    color: '#3C2C21', 
    fontWeight: '900' 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3C2C21',
    textAlign: 'center',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: '#6F5B4A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  modalSubMessage: {
    fontSize: 15,
    color: '#9A8E83',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F2CF7F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3C2C21',
    textAlign: 'center',
  },
});
