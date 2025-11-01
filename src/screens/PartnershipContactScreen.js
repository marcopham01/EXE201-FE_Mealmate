import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FixedHeader from '../components/FixedHeader';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PartnershipContactScreen() {
  const email = 'ngdlong2004@gmail.com';
  const fanpageUrl = 'https://web.facebook.com/share/1BNpxVoLRr/?mibextid=wwXIfr&_rdc=1&_rdr';
  const website = 'https://mealmate.app';
  const navigation = useNavigation();

  const openUrl = (url) => Linking.openURL(url).catch(() => {});

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FixedHeader />
      <View style={{ flex: 1, backgroundColor: '#F6F6FA' }}>
        <View style={styles.headerBlock}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#3C2C21" />
          </TouchableOpacity>
          <Text style={styles.title}>Liên hệ hợp tác</Text>
        </View>
        <View style={styles.cardShadow}> 
          <View style={styles.cardIntro}>
            <View style={styles.chip}><MaterialCommunityIcons name="clock-outline" size={16} color="#5A3E2B" /><Text style={styles.chipText}>Phản hồi trong 24h</Text></View>
            <Text style={styles.introText}>Chúng tôi sẵn sàng hợp tác với đối tác, KOLs, hoặc nhà tài trợ. Hãy liên hệ qua các kênh bên dưới.</Text>
          </View>
        </View>
        <View style={styles.cardShadow}>
          <View style={styles.card}>
            <Row icon={<Ionicons name="mail-outline" size={20} color="#5A3E2B" />} label="Email" value={email} onPress={() => openUrl(`mailto:${email}`)} actionIcon={<MaterialCommunityIcons name="open-in-new" size={18} color="#5A3E2B" />} />
            <Divider />
            <Row icon={<Ionicons name="globe-outline" size={20} color="#5A3E2B" />} label="Website" value={website.replace('https://','')} onPress={() => openUrl(website)} actionIcon={<MaterialCommunityIcons name="open-in-new" size={18} color="#5A3E2B" />} />
            <Divider />
            <Row icon={<Ionicons name="logo-facebook" size={20} color="#5A3E2B" />} label="Fanpage" value="Facebook" onPress={() => openUrl(fanpageUrl)} actionIcon={<MaterialCommunityIcons name="open-in-new" size={18} color="#5A3E2B" />} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, onPress, actionIcon }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={styles.row}> 
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {icon}
          <Text style={styles.rowLabel}>{label}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.rowValue}>{value}</Text>
          {actionIcon}
        </View>
      </View>
    </TouchableOpacity>
  );
}
function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  headerBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  title: { fontSize: 22, fontWeight: '900', color: '#3C2C21', marginLeft: 6 },
  cardShadow: { marginHorizontal: 16, marginTop: 8, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12 },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: '#4D3B2C', fontWeight: '800' },
  rowValue: { color: '#7B6C62', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#EFE7E1' },
  cardIntro: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14 },
  introText: { color: '#6F6257', lineHeight: 20, marginTop: 8 },
  chip: { alignSelf: 'flex-start', backgroundColor: '#F6E8BF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { color: '#4D3B2C', fontWeight: '800', fontSize: 12 },
});
