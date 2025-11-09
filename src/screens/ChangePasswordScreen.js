import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

function StrengthBar({ score = 0 }) {
  const colors = ['#D9D4CF', '#E57C73', '#E9B86E', '#8BC487', '#5AA86E'];
  const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
  const idx = Math.max(0, Math.min(4, score));
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ height: 8, backgroundColor: '#EEE9E2', borderRadius: 8, overflow: 'hidden' }}>
        <View style={{ width: `${(idx+1)*20}%`, height: 8, backgroundColor: colors[idx] }} />
      </View>
      <Text style={{ marginTop: 6, color: '#7B6E64', fontSize: 12, fontWeight: '700' }}>{labels[idx]}</Text>
    </View>
  );
}

export default function ChangePasswordScreen({ navigation }) {
  const [oldPwd, setOldPwd] = React.useState('');
  const [newPwd, setNewPwd] = React.useState('');
  const [confirmPwd, setConfirmPwd] = React.useState('');
  const [showOld, setShowOld] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const passwordScore = React.useMemo(() => {
    let s = 0; if (newPwd.length >= 8) s++; if (/[A-Z]/.test(newPwd)) s++; if (/[a-z]/.test(newPwd)) s++; if (/\d/.test(newPwd)) s++; if (/[^A-Za-z0-9]/.test(newPwd)) s++; return Math.min(4, Math.max(0, s-1));
  }, [newPwd]);

  const errorMsg = React.useMemo(() => {
    if (newPwd && newPwd.length < 8) return 'Mật khẩu mới tối thiểu 8 ký tự';
    if (newPwd && !/[A-Z]/.test(newPwd)) return 'Thêm ít nhất 1 chữ hoa';
    if (newPwd && !/\d/.test(newPwd)) return 'Thêm ít nhất 1 chữ số';
    if (confirmPwd && newPwd !== confirmPwd) return 'Xác nhận mật khẩu không khớp';
    return '';
  }, [newPwd, confirmPwd]);

  const canSubmit = oldPwd.length > 0 && newPwd.length >= 8 && newPwd === confirmPwd && !errorMsg;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Quay lại">
          <Ionicons name="arrow-back" size={26} color="#4D3B2C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={styles.inputCard}>
          <Text style={styles.label}>Mật khẩu hiện tại</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showOld}
              value={oldPwd}
              onChangeText={setOldPwd}
              placeholder="Nhập mật khẩu hiện tại"
              placeholderTextColor="#B9A89F"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
            />
            <TouchableOpacity onPress={() => setShowOld(v => !v)}>
              <MaterialCommunityIcons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6F655D" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Mật khẩu mới</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showNew}
              value={newPwd}
              onChangeText={setNewPwd}
              placeholder="Tối thiểu 8 ký tự, nên có chữ hoa & số"
              placeholderTextColor="#B9A89F"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <TouchableOpacity onPress={() => setShowNew(v => !v)}>
              <MaterialCommunityIcons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6F655D" />
            </TouchableOpacity>
          </View>
          <StrengthBar score={passwordScore} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              secureTextEntry={!showConfirm}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder="Nhập lại mật khẩu mới"
              placeholderTextColor="#B9A89F"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
              <MaterialCommunityIcons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6F655D" />
            </TouchableOpacity>
          </View>
        </View>

        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <TouchableOpacity disabled={!canSubmit} activeOpacity={0.9} style={[styles.saveBtn, !canSubmit ? { opacity: 0.5 } : null]} onPress={() => { /* TODO: tích hợp API sau */ }}>
          <MaterialCommunityIcons name="content-save-outline" size={18} color="#3C2C21" />
          <Text style={styles.saveBtnText}>Lưu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3F7' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '900', color: '#3C2C21' },
  inputCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginTop: 12, borderColor: 'rgba(0,0,0,0.06)', borderWidth: 1 },
  label: { color: '#4D3B2C', fontWeight: '900', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7F4F1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderColor: 'rgba(0,0,0,0.04)', borderWidth: 1 },
  input: { flex: 1, color: '#3C2C21' },
  errorText: { color: '#B3261E', marginTop: 10, fontWeight: '700' },
  saveBtn: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: '#F1CF82', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  saveBtnText: { color: '#3C2C21', fontWeight: '900' },
});


