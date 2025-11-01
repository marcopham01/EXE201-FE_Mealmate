import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getProfile } from '../api/auth';
import FixedHeader from '../components/FixedHeader';
import { usePremium } from '../context/PremiumContext';

function computeAge(birthDate) {
  if (!birthDate) return undefined;
  const dob = new Date(birthDate);
  if (isNaN(dob.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export default function ProfileScreen() {
  const [profile, setProfile] = React.useState(null);
  const [error, setError] = React.useState('');
  const navigation = useNavigation();
  const { premiumActive: isPremium } = usePremium();

  React.useEffect(() => {
    (async () => {
      try {
        const res = await getProfile();
        setProfile(res.user || res);
      } catch (e) {
        setError(e.message || 'Không lấy được hồ sơ');
      }
    })();
  }, []);

  const derivedAge = profile?.age ?? computeAge(profile?.birthDate);

  return (
    <SafeAreaView style={styles.container}>
      <FixedHeader
        extraRight={
          <TouchableOpacity activeOpacity={0.9} style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={18} color="#4D3B2C" />
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 18, marginBottom: 12 }}>
          <Text style={[styles.sectionHeader, { marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>Thông tin hồ sơ</Text>
          <TouchableOpacity
            accessibilityLabel="Cài đặt"
            onPress={() => navigation.navigate('Settings')}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}
          >
            <Ionicons name="settings-outline" size={20} color="#3C2C21" />
          </TouchableOpacity>
        </View>
        {error ? <Text style={{ color: '#B00020', marginHorizontal: 16 }}>{error}</Text> : null}
        <View style={styles.cardShadow}><View style={styles.card}>
          <Row icon="person-outline" label="Tên" value={profile?.fullName || '-'} />
          <Divider />
          <Row icon="mail-outline" label="Email" value={profile?.email || '-'} />
          <Divider />
          <Row icon="male" label="Giới tính" value={profile?.gender || '-'} />
          <Divider />
          <Row icon="calendar-outline" label="Tuổi" value={derivedAge ?? '-'} />
          <Divider />
          <Row icon="briefcase-outline" label="Công việc" value={profile?.job || '-'} />
        </View></View>
        {!isPremium && (
          <>
            <Text style={styles.sectionHeader}>Tài khoản</Text>
            <View style={styles.cardShadow}><View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="emoticon-happy-outline" size={20} color="#5A3E2B" />
                <Text style={[styles.upgradeTitle, { marginLeft: 8 }]}>Gói miễn phí</Text>
              </View>
              <Text style={styles.upgradeHint}>Nâng cấp gói cao cấp để có các tính năng độc quyền!</Text>
              <TouchableOpacity activeOpacity={0.9} style={{ marginTop: 12 }} onPress={() => navigation.navigate('Premium')}>
                <View style={styles.upgradeBtn}>
                  <MaterialCommunityIcons name="crown" size={18} color="#5A3E2B" />
                  <Text style={styles.upgradeText}>Nâng cấp gói cao cấp</Text>
                </View>
              </TouchableOpacity>
            </View></View>
          </>
        )}
        {/* Legal Section */}
        <Text style={styles.sectionHeader}>Hợp pháp</Text>
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('LegalTerms')}>
              <View style={styles.row}> 
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="file-document-outline" size={20} color="#5A3E2B" style={{ width: 22 }} />
                  <Text style={styles.rowLabel}>Điều khoản và điều kiện</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C8F86" />
              </View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('PrivacyPolicy')}>
              <View style={styles.row}> 
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="shield-check-outline" size={20} color="#5A3E2B" style={{ width: 22 }} />
                  <Text style={styles.rowLabel}>Chính sách bảo mật</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C8F86" />
              </View>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('PartnershipContact')}>
              <View style={styles.row}> 
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="email-outline" size={20} color="#5A3E2B" style={{ width: 22 }} />
                  <Text style={styles.rowLabel}>Liên hệ hợp tác</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9C8F86" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        {/* Logout removed as requested */}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }) {
  return (
    <View style={styles.row}> 
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={icon} size={18} color="#5A3E2B" style={{ width: 22 }} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { flex: 1, backgroundColor: '#EFEFF5' },
  sectionHeader: { marginTop: 18, marginBottom: 12, marginHorizontal: 16, fontSize: 22, fontWeight: '900', color: '#3C2C21' },
  cardShadow: { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  row: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { marginLeft: 6, color: '#4D3B2C', fontWeight: '800' },
  rowValue: { color: '#7B6C62', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#EFE7E1' },
  upgradeTitle: { fontSize: 17, fontWeight: '900', color: '#3C2C21' },
  upgradeHint: { color: '#9C8F86' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F1CF82', paddingVertical: 12, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  upgradeText: { color: '#3C2C21', fontWeight: '900' },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
});


