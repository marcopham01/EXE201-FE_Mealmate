import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FixedHeader from '../components/FixedHeader';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FixedHeader />
      <View style={{ flex: 1, backgroundColor: '#F6F6FA' }}>
        <View style={styles.headerBlock}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#3C2C21" />
          </TouchableOpacity>
          <Text style={styles.title}>Chính sách bảo mật</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.cardShadow}>
            <View style={styles.card}> 
              <Chip icon="shield-check-outline" text="Có hiệu lực 2025-10-01" />
              <Text style={styles.lead}>Chúng tôi cam kết bảo vệ quyền riêng tư của bạn. Tài liệu này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu.</Text>
              <SectionTitle index={1} title="Dữ liệu thu thập" />
              <Bullet text="Thông tin tài khoản (tên, email)." />
              <Bullet text="Dữ liệu sử dụng để cải thiện trải nghiệm và hiệu năng." />
              <SectionTitle index={2} title="Mục đích sử dụng" />
              <Bullet text="Cá nhân hóa trải nghiệm và gợi ý." />
              <Bullet text="Hỗ trợ khách hàng và cải thiện sản phẩm." />
              <SectionTitle index={3} title="Lưu trữ & bảo mật" />
              <Bullet text="Áp dụng mã hóa khi truyền và lưu trữ dữ liệu." />
              <Bullet text="Chỉ lưu dữ liệu trong thời gian cần thiết." />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Chip({ icon, text }) {
  return (
    <View style={styles.chip}> 
      <MaterialCommunityIcons name={icon} size={16} color="#5A3E2B" />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}
function SectionTitle({ index, title }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 6, gap: 8 }}>
      <View style={styles.indexDot}><Text style={styles.indexDotText}>{index}</Text></View>
      <Text style={styles.h2}>{title}</Text>
    </View>
  );
}
function Bullet({ text }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 6 }}>
      <View style={styles.bulletDot} />
      <Text style={styles.p}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  title: { fontSize: 22, fontWeight: '900', color: '#3C2C21', marginLeft: 6 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  cardShadow: { borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  chip: { alignSelf: 'flex-start', backgroundColor: '#F6E8BF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { color: '#4D3B2C', fontWeight: '800', fontSize: 12 },
  lead: { color: '#6F6257', lineHeight: 20, marginTop: 10 },
  h2: { fontSize: 16, fontWeight: '900', color: '#3C2C21' },
  p: { color: '#6F6257', lineHeight: 20, flex: 1 },
  indexDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1D590', alignItems: 'center', justifyContent: 'center' },
  indexDotText: { color: '#3C2C21', fontWeight: '900' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4B39E', marginTop: 8 },
});
