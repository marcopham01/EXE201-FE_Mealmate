import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';

function NoticeCard({ title, body, timeAgo, unread, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.cardShadow} onPress={onPress}>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.time}>{timeAgo}</Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationScreen({ navigation }) {
  const { unreadCount, setUnreadCount } = useNotifications();
  const [items, setItems] = React.useState([
    {
      id: 'n1',
      title: 'Nâng cấp gói cao cấp thành công',
      body: 'Bạn đã nâng cấp gói cao cấp thành công! Bây giờ bạn có thể sử dụng tất cả các tính năng độc quyền của ứng dụng.',
      timeAgo: '20 phút trước',
      unread: true,
    },
    {
      id: 'n2',
      title: '"Chế độ ăn lành mạnh cho tuần mới!"',
      body: 'Thực đơn 3 bữa/ngày không dầu mỡ, ít gia vị nhưng vẫn ngon miệng và đủ chất. Click để khám phá!',
      timeAgo: '2h trước',
      unread: true,
    },
    {
      id: 'n3',
      title: '"5 món ăn nhanh cho người tăng ca"',
      body: 'Không kịp nấu nướng? Chúng tôi gợi ý 5 món lót dạ vừa nhanh vừa đủ năng lượng cho dân văn phòng.',
      timeAgo: '5h trước',
      unread: false,
    },
  ]);

  const markAllRead = () => {
    setItems((prev) => prev.map((it) => ({ ...it, unread: false })));
    setUnreadCount(0);
  };

  // Chỉ cập nhật unreadCount khi có thay đổi trong items (không refresh khi quay lại tab)
  React.useEffect(() => {
    const count = items.filter((i) => i.unread).length;
    setUnreadCount(count);
  }, [items, setUnreadCount]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Quay lại">
          <Ionicons name="arrow-back" size={26} color="#4D3B2C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 120 }}>
        {items.map((n) => (
          <NoticeCard key={n.id} title={n.title} body={n.body} timeAgo={n.timeAgo} unread={n.unread} onPress={() => {}} />
        ))}
      </ScrollView>

      <View style={styles.footerBar}>
        <TouchableOpacity activeOpacity={0.9} style={styles.readBtn} onPress={markAllRead}>
          <Ionicons name="checkmark" size={18} color="#3C2C21" />
          <Text style={styles.readBtnText}>Đánh dấu đã đọc</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F1F5' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '900', color: '#3C2C21', letterSpacing: 0.3 },
  cardShadow: { marginTop: 10, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderColor: 'rgba(0,0,0,0.05)', borderWidth: 1 },
  time: { color: '#9C8F86', fontSize: 12, fontWeight: '800' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F3CF7A', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  title: { marginTop: 4, color: '#3C2C21', fontSize: 16, fontWeight: '900' },
  body: { marginTop: 6, color: '#6F655D' },
  footerBar: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
  readBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F1CF82', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  readBtnText: { color: '#3C2C21', fontWeight: '900' },
});


