import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import FixedHeader from '../components/FixedHeader';
import { usePremium } from '../context/PremiumContext';

const TOP_TABS = ['Mới nhất', 'Thực đơn'];
const MEAL_TABS = ['Sáng', 'Trưa', 'Tối'];

function RecipeCard({ title, desc, time }) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.recipeShadow}>
      <View style={styles.recipeCard}> 
        <View style={{ flex: 1, padding: 14 }}>
          <Text style={styles.recipeTitle}>{title}</Text>
          <Text style={styles.recipeDesc}>{desc}</Text>
          <Text style={styles.recipeTime}>Thời gian: {time}</Text>
        </View>
        <View style={styles.recipeRight}> 
          <Ionicons name="bookmark" size={18} color="#3C2C21" style={{ alignSelf: 'flex-end', margin: 10, opacity: 0.8 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RecipeScreen() {
  const navigation = useNavigation();
  const { premiumActive } = usePremium();
  const [activeTab, setActiveTab] = React.useState(0);
  const [activeMeal, setActiveMeal] = React.useState(0);

  // Mock recipe data for UI
  const recipesByMeal = React.useMemo(() => ({
    0: [
      { title: 'BÁNH MÌ TRỨNG\n+ PATE + RAU', desc: 'Bánh mì, trứng, pate, rau', time: '5 phút' },
      { title: 'BÁNH MÌ TRỨNG\n+ PATE + RAU', desc: 'Bánh mì, trứng, pate, rau', time: '5 phút' },
      { title: 'BÁNH MÌ TRỨNG\n+ PATE + RAU', desc: 'Bánh mì, trứng, pate, rau', time: '5 phút' },
    ],
    1: [
      { title: 'CƠM GÀ NGŨ VỊ', desc: 'Cơm, ức gà, rau củ', time: '20 phút' },
      { title: 'BÚN THỊT NƯỚNG', desc: 'Bún, thịt heo, rau sống', time: '25 phút' },
    ],
    2: [
      { title: 'MÌ Ý SỐT CÀ', desc: 'Pasta, sốt cà, phô mai', time: '15 phút' },
    ],
  }), []);

  const list = recipesByMeal[activeMeal] || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FixedHeader onPressPremium={premiumActive ? undefined : () => navigation.navigate('Premium')} />
      <View style={styles.body}>
        <View style={styles.softDivider} />
        {/* Search Bar */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#9F9A94" style={{ marginLeft: 10, marginRight: 6 }} />
          <TextInput placeholder="Nhập nguyên liệu" placeholderTextColor="#B7B2AE" style={styles.input} />
        </View>
        {/* Top Tabs */}
        <View style={styles.tabRow}>
          {TOP_TABS.map((lbl, i) => (
            <TouchableOpacity
              key={lbl}
              style={styles.tabBtn}
              onPress={() => setActiveTab(i)}
              activeOpacity={0.81}
            >
              <Text style={[styles.tabLabel, activeTab === i && styles.tabLabelActive]}>{lbl}</Text>
              {activeTab === i && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 0 ? (
          <>
            {/* Sub meal tab (Sáng/Trưa/Tối) */}
            <View style={styles.mealTabRow}>
              {MEAL_TABS.map((lbl, i) => (
                <TouchableOpacity
                  key={lbl}
                  style={[styles.mealTabBtn, activeMeal === i && styles.mealTabBtnActive]}
                  onPress={() => setActiveMeal(i)}
                  activeOpacity={0.78}>
                  <Text style={[styles.mealTabLabel, activeMeal === i && styles.mealTabLabelActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recipe list */}
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 120 }}>
              {list.length === 0 ? (
                <Text style={styles.emptyRecipe}>Chưa có công thức</Text>
              ) : (
                list.map((r, idx) => (
                  <RecipeCard key={idx} title={r.title} desc={r.desc} time={r.time} />
                ))
              )}
            </ScrollView>
          </>
        ) : premiumActive ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 }}>
            <Text style={{ fontWeight: '900', color: '#3C2C21', fontSize: 18, marginBottom: 10 }}>Thực đơn cá nhân</Text>
            <Text style={{ color: '#7D6E62', marginBottom: 12 }}>Tính năng soạn thực đơn sẽ hiển thị tại đây (đang phát triển nội dung chi tiết).</Text>
            {list.map((r, idx) => (
              <RecipeCard key={idx} title={r.title} desc={r.desc} time={r.time} />
            ))}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name="crown" size={72} color="#A9A29C" style={{ marginBottom: 24 }} />
            <Text style={styles.lockTitle}>Mở gói cao cấp để sử dụng tính năng này</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: '#F6F6FA' },
  softDivider: { height: 1, backgroundColor: '#EEE9E2', marginHorizontal: 16, opacity: 0.7 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10, marginHorizontal: 20,
    backgroundColor: '#F0EEEC', borderRadius: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  input: { flex: 1, fontSize: 16, color: '#3C2C21', marginLeft: 6, paddingVertical: 4 },
  tabRow: {
    marginTop: 10, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20,
    borderBottomColor: '#F1E8DA', borderBottomWidth: 1, minHeight: 46,
  },
  tabBtn: { paddingBottom: 9 },
  tabLabel: { fontSize: 18, color: '#826F60', fontWeight: '900' },
  tabLabelActive: { color: '#3C2C21' },
  tabUnderline: { marginTop: 6, height: 4, backgroundColor: '#F3DEAA', borderRadius: 3, width: 70, alignSelf: 'center' },
  mealTabRow: { marginTop: 12, flexDirection: 'row', gap: 16, justifyContent: 'center' },
  mealTabBtn: { borderRadius: 28, backgroundColor: '#EEE6D8', paddingHorizontal: 20, paddingVertical: 9 },
  mealTabBtnActive: { backgroundColor: '#FAE2AF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  mealTabLabel: { fontSize: 15, color: '#94826C', fontWeight: '700' },
  mealTabLabelActive: { color: '#3C2C21', fontWeight: '900' },
  emptyRecipe: { color: '#B6ADA7', fontWeight: '800', fontSize: 24, textAlign: 'center', marginTop: 40 },
  // Recipe cards
  recipeShadow: { borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3, marginBottom: 12 },
  recipeCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
  recipeRight: { width: 110, backgroundColor: '#EFD493' },
  recipeTitle: { color: '#3C2C21', fontWeight: '900', fontSize: 18, lineHeight: 22 },
  recipeDesc: { color: '#8E7F73', marginTop: 6 },
  recipeTime: { color: '#9A8A7B', marginTop: 10, fontWeight: '800' },
  lockTitle: { color: '#9A9390', fontWeight: '900', fontSize: 22, textAlign: 'center', paddingHorizontal: 28, lineHeight: 30, maxWidth: 360 },
});
