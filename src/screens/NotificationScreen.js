import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';
import { usePremium } from '../context/PremiumContext';
import { listNotifications, markAllNotificationsRead, markNotificationRead, deleteNotification, createWeeklyKcalSummary } from '../api/notification';

function typeToIcon(type) {
  switch (type) {
    case 'premium_success':
      return 'crown-outline';
    case 'weekly_kcal':
    case 'weekly-kcal':
      return 'fire';
    case 'promotion':
      return 'tag-outline';
    case 'system':
      return 'information-outline';
    default:
      return 'bell-outline';
  }
}

function NoticeCard({ title, body, timeAgo, unread, onPress, onDelete, type }) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.cardShadow} onPress={onPress}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.iconBadge, unread ? styles.iconBadgeUnread : null]}>
              <MaterialCommunityIcons name={typeToIcon(type)} size={18} color="#3C2C21" />
            </View>
            <Text style={styles.time}>{timeAgo}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {unread ? <View style={styles.unreadDot} /> : null}
            <TouchableOpacity accessibilityLabel="Xóa thông báo" onPress={onDelete}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#A28E7C" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationScreen({ navigation }) {
  const { setUnreadCount, notificationsEnabled, setNotificationsEnabled } = useNotifications();
  const { premiumActive } = usePremium();
  const [items, setItems] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [unreadOnly, setUnreadOnly] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const fetchedOnFocusRef = React.useRef(false);
  const filterDidMountRef = React.useRef(false);
  const inFlightRef = React.useRef(false);
  const lastFetchAtRef = React.useRef(0);
  const isInitialMountRef = React.useRef(true);
  const totalItemsRef = React.useRef(Number.MAX_SAFE_INTEGER);

  const formatTimeAgo = (iso) => {
    try {
      const d = new Date(iso);
      const diff = Math.max(0, Date.now() - d.getTime());
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'vừa xong';
      if (m < 60) return `${m} phút trước`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} giờ trước`;
      const days = Math.floor(h / 24);
      return `${days} ngày trước`;
    } catch {
      return '';
    }
  };

  const mapApiItem = (n) => ({
    id: n?._id || n?.id,
    title: n?.title || n?.compound || 'Thông báo',
    body: n?.message || n?.content || '',
    timeAgo: formatTimeAgo(n?.createdAt || n?.created_at || n?.time),
    unread: n?.read === false || n?.is_read === false,
    raw: n,
    type: n?.type || 'general',
  });

  const computeUnreadCount = React.useCallback((arr) => arr.filter((i) => i.unread).length, []);

  const fetchPage = React.useCallback(async (nextPage, replace = false) => {
    // Chặn gọi trùng do StrictMode/dev hoặc render lại nhanh
    if (inFlightRef.current) {
      console.debug('[NotificationScreen] skip fetch (in-flight)');
      return;
    }
    const now = Date.now();
    // Tăng thời gian debounce lên 1000ms để tránh multiple calls
    if (now - lastFetchAtRef.current < 1000) {
      console.debug('[NotificationScreen] skip fetch (too soon)');
      return;
    }
    inFlightRef.current = true;
    lastFetchAtRef.current = now;
    
    // Chỉ set loading nếu là page đầu tiên hoặc replace
    if (nextPage === 1 || replace) {
      setLoading(true);
    }
    
    try {
      console.debug('[NotificationScreen] fetchPage', { nextPage, replace, limit, unreadOnly });
      const res = await listNotifications({ page: nextPage, limit, unreadOnly });
      const data = Array.isArray(res?.data) ? res.data : [];
      const mapped = data.map(mapApiItem);
      const total = res?.pagination?.total ?? Number.MAX_SAFE_INTEGER;
      totalItemsRef.current = total;
      
      // Batch update để tránh multiple re-renders
      // Không gọi setState khác trong setItems callback - sẽ update sau bằng useEffect
      setItems((prev) => {
        const next = replace ? mapped : [...prev, ...mapped];
        console.debug('[NotificationScreen] merged items', { prevLen: prev.length, add: mapped.length, nextLen: next.length, total });
        return next;
      });
      
      setPage(nextPage);
    } catch (e) {
      console.warn('[NotificationScreen] fetchPage error', e?.message);
      // Chỉ alert nếu không phải là lỗi nhỏ
      if (!e?.message?.includes('Missing access token')) {
        Alert.alert('Lỗi', e?.message || 'Không tải được thông báo');
      }
    } finally { 
      setLoading(false); 
      inFlightRef.current = false; 
    }
  }, [limit, unreadOnly]);

  const refreshList = React.useCallback(async () => {
    // Chặn refresh nếu đang fetch hoặc vừa mới fetch
    if (inFlightRef.current) {
      console.debug('[NotificationScreen] skip refresh (in-flight)');
      return;
    }
    const now = Date.now();
    if (now - lastFetchAtRef.current < 1000) {
      console.debug('[NotificationScreen] skip refresh (too soon)');
      return;
    }
    setRefreshing(true);
    try {
      await fetchPage(1, true);
    } finally { 
      setRefreshing(false); 
    }
  }, [fetchPage]);

  const markAllRead = async () => {
    try {
      console.debug('[NotificationScreen] markAllRead');
      await markAllNotificationsRead();
      setItems((prev) => prev.map((it) => ({ ...it, unread: false })));
      setUnreadCount(0);
      Alert.alert('Thành công', 'Đã đánh dấu tất cả là đã đọc');
    } catch (e) {
      console.warn('[NotificationScreen] markAllRead error', e?.message);
      Alert.alert('Lỗi', e?.message || 'Không thể đánh dấu đã đọc');
    }
  };

  const onPressCard = async (item) => {
    if (!item?.unread) return;
    try {
      console.debug('[NotificationScreen] mark single read', { id: item.id });
      const res = await markNotificationRead(item.id);
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, unread: false } : it));
      setUnreadCount((cnt) => Math.max(0, cnt - 1));
    } catch (e) {
      console.warn('[NotificationScreen] mark single read error', e?.message);
      Alert.alert('Lỗi', e?.message || 'Không thể đánh dấu đã đọc');
    }
  };

  const onDeleteCard = async (item) => {
    try {
      console.debug('[NotificationScreen] delete', { id: item.id });
      await deleteNotification(item.id);
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setUnreadCount((cnt) => Math.max(0, item.unread ? cnt - 1 : cnt));
    } catch (e) {
      console.warn('[NotificationScreen] delete error', e?.message);
      Alert.alert('Lỗi', e?.message || 'Không thể xóa thông báo');
    }
  };

  const onWeeklyKcal = async () => {
    if (!premiumActive) {
      Alert.alert(
        'Tính năng cao cấp',
        'Tổng kết kcal 7 ngày chỉ dành cho tài khoản cao cấp. Nâng cấp ngay để sử dụng!',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Nâng cấp', onPress: () => navigation.navigate('Premium') },
        ]
      );
      return;
    }
    try {
      console.debug('[NotificationScreen] weekly-kcal create');
      const res = await createWeeklyKcalSummary();
      Alert.alert('Thành công', res?.message || 'Đã tạo thông báo tổng kết');
      await refreshList();
    } catch (e) {
      console.warn('[NotificationScreen] weekly-kcal error', e?.message);
      Alert.alert('Lỗi', e?.message || 'Không thể tạo thông báo tổng kết');
    }
  };

  // Fetch khi màn hình được focus - chỉ một lần duy nhất
  useFocusEffect(React.useCallback(() => {
    if (!notificationsEnabled) return;
    
    // Chỉ fetch một lần khi focus lần đầu, không fetch lại nếu đã có data
    // Điều này đảm bảo không bị chập chờn do multiple fetches
    if (!fetchedOnFocusRef.current && items.length === 0 && !inFlightRef.current) {
      fetchedOnFocusRef.current = true;
      refreshList();
    }
    
    return () => {
      // Reset khi blur để lần sau focus lại có thể fetch nếu cần
      fetchedOnFocusRef.current = false;
    };
  }, [notificationsEnabled, items.length, refreshList]));

  // Update unreadCount và hasMore khi items thay đổi
  React.useEffect(() => {
    const unreadCount = computeUnreadCount(items);
    setUnreadCount(unreadCount);
    const hasMoreData = items.length > 0 && items.length < totalItemsRef.current;
    setHasMore(hasMoreData);
  }, [items, computeUnreadCount, setUnreadCount]);

  // Khi chuyển chip lọc, tự động refresh - chỉ một lần
  React.useEffect(() => {
    if (!notificationsEnabled) return;
    
    // Bỏ qua lần mount đầu tiên để tránh double-fetch với focus
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    
    // Chỉ refresh nếu không đang fetch
    if (!inFlightRef.current) {
      setItems([]);
      setPage(1);
      refreshList();
    }
  }, [unreadOnly, notificationsEnabled, refreshList]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Quay lại">
          <Ionicons name="arrow-back" size={26} color="#4D3B2C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={{ width: 26 }} />
      </View>

      {!notificationsEnabled ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <MaterialCommunityIcons name="bell-off-outline" size={48} color="#9C8F86" />
          <Text style={{ marginTop: 10, color: '#6F655D', textAlign: 'center' }}>Bạn đã tắt thông báo. Bật lại để nhận cập nhật mới nhất.</Text>
          <TouchableOpacity style={[styles.readBtn, { marginTop: 14 }]} onPress={() => setNotificationsEnabled(true)}>
            <MaterialCommunityIcons name="bell-outline" size={18} color="#3C2C21" />
            <Text style={styles.readBtnText}>Bật thông báo</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <View style={{ flex: 1 }}>
        <View style={styles.filterRow}>
          <TouchableOpacity onPress={() => { if (unreadOnly) { setUnreadOnly(false); } }} style={[styles.chip, !unreadOnly ? styles.chipActive : null]}>
            <Text style={[styles.chipText, !unreadOnly ? styles.chipTextActive : null]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { if (!unreadOnly) { setUnreadOnly(true); } }} style={[styles.chip, unreadOnly ? styles.chipActive : null]}>
            <Text style={[styles.chipText, unreadOnly ? styles.chipTextActive : null]}>Chưa đọc</Text>
          </TouchableOpacity>
        </View>

        {loading && page === 1 && items.length === 0 ? (
          <View style={{ paddingHorizontal: 12 }}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 140, paddingTop: 6 }}
          renderItem={({ item }) => (
            <NoticeCard
              title={item.title}
              body={item.body}
              timeAgo={item.timeAgo}
              unread={item.unread}
              type={item.type}
              onPress={() => onPressCard(item)}
              onDelete={() => onDeleteCard(item)}
            />
          )}
          onEndReached={() => { if (hasMore && !loading && !inFlightRef.current) fetchPage(page + 1); }}
          onEndReachedThreshold={0.2}
          refreshing={refreshing}
          onRefresh={refreshList}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          ListFooterComponent={loading && items.length > 0 ? (
            <View style={{ paddingVertical: 14 }}>
              <ActivityIndicator color="#9C8F86" />
            </View>
          ) : null}
          ListEmptyComponent={!loading && !refreshing ? (
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <MaterialCommunityIcons name="bell-outline" size={36} color="#A28E7C" />
              <Text style={{ marginTop: 8, color: '#6F655D' }}>Chưa có thông báo nào</Text>
            </View>
          ) : null}
        />
        )}
      </View>
      )}

      {notificationsEnabled && (
      <View style={styles.footerBar}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity activeOpacity={0.9} style={styles.readBtn} onPress={markAllRead}>
            <MaterialCommunityIcons name="check" size={18} color="#3C2C21" />
            <Text style={styles.readBtnText}>Đánh dấu đã đọc</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} style={styles.summaryBtn} onPress={onWeeklyKcal}>
            <MaterialCommunityIcons name="fire" size={18} color="#3C2C21" />
            <Text style={styles.readBtnText}>Tổng kết kcal 7 ngày</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F1F5' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '900', color: '#3C2C21', letterSpacing: 0.3 },
  cardShadow: { marginTop: 10, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderColor: 'rgba(0,0,0,0.06)', borderWidth: 1.2 },
  time: { color: '#9C8F86', fontSize: 12, fontWeight: '800' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F3CF7A', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  title: { marginTop: 4, color: '#3C2C21', fontSize: 16, fontWeight: '900' },
  body: { marginTop: 6, color: '#6F655D' },
  footerBar: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
  readBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1CF82', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  readBtnText: { color: '#3C2C21', fontWeight: '900' },
  summaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#CDE7BE', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  loadMoreBtn: { backgroundColor: '#E8E2DA', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  loadMoreText: { color: '#3C2C21', fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EFEAE6' },
  chipActive: { backgroundColor: '#3C2C21' },
  chipText: { color: '#6F655D', fontWeight: '800' },
  chipTextActive: { color: '#FFFFFF' },
  iconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F4EFE9', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(0,0,0,0.06)', borderWidth: 1 },
  iconBadgeUnread: { backgroundColor: '#FFF5D9' },
  skeletonCard: { height: 84, borderRadius: 16, backgroundColor: '#EEE7E1', marginTop: 10, opacity: 0.6 },
});


