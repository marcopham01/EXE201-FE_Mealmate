import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const MEAL_TYPES = ['Sáng', 'Trưa', 'Tối'];

// Mock data based on the images
const MOCK_DATA = {
  'Sáng': [
    { id: '1', name: 'BÁNH MÌ TRỨNG + PATE + RAU', ingredients: 'Bánh mì, trứng, pate, rau', time: '5 phút' },
    { id: '2', name: 'BÁNH MÌ TRỨNG + PATE + RAU', ingredients: 'Bánh mì, trứng, pate, rau', time: '5 phút' },
  ],
  'Trưa': [
    { id: '3', name: 'CƠM HỘP THỊT KHO TRỨNG + RAU LUỘC', ingredients: 'Thịt ba rọi, trứng, rau', time: '15 phút' },
    { id: '4', name: 'CANH RAU NGÓT TRỨNG + ĐẬU HŨ', ingredients: 'Trứng, đậu hũ, rau ngót', time: '15 phút' },
    { id: '5', name: 'CƠM HỘP THỊT KHO TRỨNG + RAU LUỘC', ingredients: 'Thịt ba rọi, trứng, rau', time: '15 phút' },
  ],
  'Tối': [
     { id: '6', name: 'CANH RAU NGÓT TRỨNG + ĐẬU HŨ', ingredients: 'Trứng, đậu hũ, rau ngót', time: '15 phút' },
  ],
};

const { width } = Dimensions.get('window');

export default function AnalyzeResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  // const { results } = route.params; // Use this when data is passed
  const [activeMealType, setActiveMealType] = useState('Trưa');

  const meals = MOCK_DATA[activeMealType] || [];

  const handleConfirm = () => {
    // Logic to handle confirmation
    navigation.navigate('Main');
  };

  const handleRetry = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3C2C21" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danh sách món ăn</Text>
      </View>

      <View style={styles.mealTypeSelector}>
        {MEAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.mealTypeButton, activeMealType === type && styles.activeMealTypeButton]}
            onPress={() => setActiveMealType(type)}
          >
            <Text style={[styles.mealTypeText, activeMealType === type && styles.activeMealTypeText]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 120 }}>
        {meals.map((item) => (
          <TouchableOpacity key={item.id} activeOpacity={0.88} style={styles.recipeShadow}>
            <View style={styles.recipeCard}>
              <View style={{ flex: 1, padding: 14 }}>
                <Text style={styles.recipeTitle}>{item.name}</Text>
                <Text style={styles.recipeDesc}>{item.ingredients}</Text>
                <Text style={styles.recipeTime}>Thời gian: {item.time}</Text>
              </View>
              <View style={styles.recipeRight}>
                <Ionicons name="bookmark" size={18} color="#3C2C21" style={{ alignSelf: 'flex-end', margin: 10, opacity: 0.8 }} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleRetry}>
          <Text style={styles.secondaryButtonText}>Làm lại</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleConfirm}>
          <Text style={styles.primaryButtonText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2D2D2D',
    marginLeft: 12,
  },
  mealTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 16,
  },
  mealTypeButton: {
    borderRadius: 28,
    backgroundColor: '#EEE6D8',
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  activeMealTypeButton: {
    backgroundColor: '#FAE2AF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  mealTypeText: {
    fontSize: 15,
    color: '#94826C',
    fontWeight: '700',
  },
  activeMealTypeText: {
    color: '#3C2C21',
    fontWeight: '900',
  },
  // Styles from RecipeScreen
  recipeShadow: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    marginBottom: 12,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  recipeRight: {
    width: 110,
    backgroundColor: '#EFD493',
  },
  recipeTitle: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 22,
  },
  recipeDesc: {
    color: '#8E7F73',
    marginTop: 6,
  },
  recipeTime: {
    color: '#9A8A7B',
    marginTop: 10,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E7E6',
    backgroundColor: '#F6F6FA',
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFD37A',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5C3A2B',
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
  },
  secondaryButtonText: {
    color: '#3C2C21',
    fontWeight: '900',
    fontSize: 18,
  },
});


