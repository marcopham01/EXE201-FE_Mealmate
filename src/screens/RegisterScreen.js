import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { register as registerApi } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

function pad(n){return n<10?`0${n}`:`${n}`}

function MiniCalendar({ value, onChange }) {
  const init = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = React.useState(new Date(init.getFullYear(), init.getMonth(), 1));
  const [showYearPicker, setShowYearPicker] = React.useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const firstIdx = (startWeekday + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstIdx; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const pick = (d) => {
    if (!d) return;
    const selected = new Date(year, month, d);
    onChange(`${selected.getFullYear()}-${pad(selected.getMonth()+1)}-${pad(selected.getDate())}`);
  };

  const weekLabels = ['T2','T3','T4','T5','T6','T7','CN'];

  // Năm từ 1960 đến hiện tại (giảm dần)
  const yearCandidates = React.useMemo(() => {
    const end = new Date().getFullYear();
    const start = 1960;
    const arr = [];
    for (let y = end; y >= start; y--) arr.push(y);
    return arr;
  }, []);

  return (
    <View style={styles.calWrap}>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.calNav}><Ionicons name="chevron-back" size={18} color="#3C2C21" /></TouchableOpacity>
        <TouchableOpacity onPress={() => setShowYearPicker((s) => !s)} activeOpacity={0.85}>
          <Text style={styles.calTitle}>{`Tháng ${month+1}/${year}`}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextMonth} style={styles.calNav}><Ionicons name="chevron-forward" size={18} color="#3C2C21" /></TouchableOpacity>
      </View>

      {showYearPicker && (
        <View style={styles.yearListWrap}>
          <ScrollView style={{ maxHeight: 240 }} contentContainerStyle={{ paddingVertical: 6 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {yearCandidates.map((y) => (
              <TouchableOpacity key={y} onPress={() => { setViewDate(new Date(y, month, 1)); setShowYearPicker(false); }}>
                <View style={[styles.yearRowItem, y === year && styles.yearRowItemActive]}>
                  <Text style={[styles.yearRowText, y === year && styles.yearRowTextActive]}>{y}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.calGrid}>
        {weekLabels.map((w) => (
          <Text key={w} style={styles.calWeek}>{w}</Text>
        ))}
        {cells.map((d, idx) => (
          <TouchableOpacity key={idx} style={[styles.calCell, d && styles.calCellActive]} activeOpacity={d?0.8:1} onPress={() => pick(d)}>
            <Text style={[styles.calCellText, !d && { opacity: 0 }]}>{d || ''}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = React.useState(true);
  const [username, setUsername] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [gender, setGender] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [birthDate, setBirthDate] = React.useState(''); // YYYY-MM-DD
  const [job, setJob] = React.useState('');
  const [showCal, setShowCal] = React.useState(false);

  const validateDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}> 
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.card} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <Image source={require('../../assets/images/MealMate Logo.png')} style={styles.logoTop} resizeMode="contain" />
        <Text style={styles.title}>Đăng ký</Text>

        <Text style={styles.label}>Tên đăng nhập</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#8D8580" />
          <TextInput placeholder="abc" style={styles.inputField} value={username} onChangeText={setUsername} autoCapitalize="none" />
        </View>
        <Text style={styles.label}>Họ và tên</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="id-card-outline" size={18} color="#8D8580" />
          <TextInput placeholder="Nguyễn Văn A" style={styles.inputField} value={fullName} onChangeText={setFullName} />
        </View>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#8D8580" />
          <TextInput placeholder="email@example.com" keyboardType="email-address" style={styles.inputField} value={email} onChangeText={setEmail} autoCapitalize="none" />
        </View>
        <Text style={styles.label}>Số điện thoại</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={18} color="#8D8580" />
          <TextInput placeholder="0901234567" keyboardType="phone-pad" style={styles.inputField} value={phoneNumber} onChangeText={setPhoneNumber} />
        </View>
        <Text style={styles.label}>Giới tính</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['male','female'].map((opt) => (
            <TouchableOpacity key={opt} activeOpacity={0.85} onPress={() => setGender(opt)}>
              <View style={[styles.chip, gender === opt && styles.chipActive]}>
                <Text style={[styles.chipText, gender === opt && styles.chipTextActive]}>{opt === 'male' ? 'Nam' : 'Nữ'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Ngày sinh (YYYY-MM-DD)</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="calendar-outline" size={18} color="#8D8580" />
          <TextInput placeholder="2004-07-04" style={styles.inputField} value={birthDate} onChangeText={setBirthDate} autoCapitalize="none" onFocus={() => setShowCal(true)} />
          <TouchableOpacity onPress={() => setShowCal((s)=>!s)}><Ionicons name={showCal? 'chevron-up' : 'chevron-down'} size={18} color="#8D8580" /></TouchableOpacity>
        </View>
        {showCal && (
          <MiniCalendar value={birthDate} onChange={(v)=>{ setBirthDate(v); setShowCal(false); }} />
        )}
        <Text style={styles.label}>Nghề nghiệp</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {['Học sinh','Sinh viên','Đã đi làm'].map((opt) => (
            <TouchableOpacity key={opt} activeOpacity={0.85} onPress={() => setJob(opt)}>
              <View style={[styles.chip, job === opt && styles.chipActive]}>
                <Text style={[styles.chipText, job === opt && styles.chipTextActive]}>{opt}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#8D8580" />
          <TextInput placeholder="123!@#" secureTextEntry style={styles.inputField} value={password} onChangeText={setPassword} />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            if (!agreed) return;
            try {
              if (!username || !fullName || !email || !password || !birthDate || !job) { alert('Vui lòng nhập đầy đủ thông tin bắt buộc'); return; }
              if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) { alert('Ngày sinh phải theo định dạng YYYY-MM-DD'); return; }
              await registerApi({ username, password, phoneNumber, email, fullName, gender, birthDate, job });
              alert('Đăng ký thành công. Vui lòng đăng nhập');
              navigation.reset({ index: 0, routes: [{ name: 'LoginForm' }] });
            } catch (e) {
              alert(e.message || 'Đăng ký thất bại');
            }
          }}
          disabled={!agreed}
        >
          <LinearGradient colors={["#E8D29D", "#F8CF73"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.primaryBtn, !agreed && { opacity: 0.5 }]}>
            <Text style={styles.primaryText}>Đăng ký</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.termsRow} activeOpacity={0.9} onPress={() => setAgreed(!agreed)}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <View style={styles.termsCol}>
            <Text style={styles.termsLight}>Tôi xác nhận rằng tôi đã đọc và đồng ý với</Text>
            <Text style={styles.termsDark}>Điều khoản sử dụng và Chính sách bảo mật.</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFEFF5' },
  card: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'stretch',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: -8, alignSelf: 'flex-start' },
  logoTop: { width: 120, height: 120, alignSelf: 'center', marginTop: 8, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: '#1F1F1F', marginTop: 14, textAlign: 'center', letterSpacing: 0.3 },
  label: { marginTop: 18, marginBottom: 8, color: '#3C3C3C', fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  inputField: { flex: 1, paddingVertical: 10, paddingHorizontal: 2 },
  chip: { backgroundColor: '#EEE6D8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  chipActive: { backgroundColor: '#FAE2AF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  chipText: { color: '#94826C', fontWeight: '700' },
  chipTextActive: { color: '#3C2C21', fontWeight: '900' },
  primaryBtn: { paddingVertical: 16, borderRadius: 28, alignItems: 'center', marginTop: 36, width: '100%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  primaryText: { fontWeight: '700', color: '#3C2C21' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'center', marginTop: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, backgroundColor: '#C2BBB6', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#9B938E' },
  termsCol: { flexDirection: 'column' },
  termsLight: { color: '#A9A4A0', fontSize: 12 },
  termsDark: { color: '#6E6B69', fontSize: 14, fontWeight: '600' },
  calWrap: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, marginTop: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calTitle: { fontWeight: '900', color: '#3C2C21' },
  calNav: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EEE8', borderRadius: 8 },
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  yearChip: { backgroundColor: '#EEE6D8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  yearChipActive: { backgroundColor: '#FAE2AF' },
  yearText: { color: '#7F7469', fontWeight: '700' },
  yearTextActive: { color: '#3C2C21', fontWeight: '900' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calWeek: { width: `${100/7}%`, textAlign: 'center', color: '#9C948A', marginBottom: 6, fontWeight: '700' },
  calCell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderRadius: 10 },
  calCellActive: { backgroundColor: '#FFF8E0' },
  calCellText: { color: '#3C2C21', fontWeight: '800' },
  yearListWrap: {
    backgroundColor: '#F2EEE8',
    borderRadius: 14,
    padding: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  yearRowItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  yearRowItemActive: {
    backgroundColor: '#FAE2AF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  yearRowText: { color: '#7F7469', fontWeight: '700' },
  yearRowTextActive: { color: '#3C2C21', fontWeight: '900' },
});


