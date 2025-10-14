import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const items = [
    { key: 'Journal', icon: 'book-outline', label: 'Nhật ký' },
    { key: 'Analytics', icon: 'stats-chart-outline', label: 'Phân tích' },
    { key: 'Camera', icon: 'camera', label: '' },
    { key: 'Recipes', icon: 'restaurant-outline', label: 'Công thức' },
    { key: 'Profile', icon: 'person-outline', label: 'Hồ sơ' },
  ];

  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          paddingHorizontal: 10,
          height: 66,
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        {/* Left two */}
        {items.slice(0,2).map((it, idx) => {
          const route = state.routes[idx];
          const isFocused = state.index === idx;
          return (
            <TouchableOpacity
              key={it.key}
              onPress={() => navigation.navigate(route.name)}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <Ionicons name={it.icon} size={22} color={isFocused ? '#3C2C21' : '#B9A89F'} />
              <Text style={{ fontSize: 10, color: isFocused ? '#3C2C21' : '#B9A89F' }}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Center camera */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Camera')}
          style={{
            width: 64,
            height: 64,
            backgroundColor: '#EFCB7B',
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <Ionicons name="camera" size={26} color="#3C2C21" />
        </TouchableOpacity>

        {/* Right two */}
        {items.slice(3).map((it, idx) => {
          const route = state.routes[idx+3];
          const isFocused = state.index === idx+3;
          return (
            <TouchableOpacity
              key={it.key}
              onPress={() => navigation.navigate(route.name)}
              style={{ flex: 1, alignItems: 'center' }}
            >
              <Ionicons name={it.icon} size={22} color={isFocused ? '#3C2C21' : '#B9A89F'} />
              <Text style={{ fontSize: 10, color: isFocused ? '#3C2C21' : '#B9A89F' }}>{it.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function BottomTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} /> }>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarStyle: { display: 'none' } }} />
      <Tab.Screen name="Analytics" component={PlaceholderScreen} />
      <Tab.Screen name="Camera" component={PlaceholderScreen} />
      <Tab.Screen name="Recipes" component={PlaceholderScreen} />
      <Tab.Screen name="Profile" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}


