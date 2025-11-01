import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoadingScreen({ navigation }) {
  React.useEffect(() => {
    const t = setTimeout(() => navigation.replace('LoginLanding'), 1200);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <LinearGradient colors={["#F4E4B5", "#F1CF82"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.full}>
      <Image source={require('../../assets/images/MealMate Logo.png')} style={styles.logo} resizeMode="contain" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 160, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#3C2C21' },
  sub: { fontSize: 10, color: '#6F5E50', marginTop: 2 },
});


