import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import RecipeScreen from '../screens/RecipeScreen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const items = [
    { key: 'Journal', icon: 'book-outline', label: 'Nhật ký', routeName: 'Home' },
    { key: 'Analytics', icon: 'stats-chart-outline', label: 'Phân tích', routeName: 'Analytics' },
    { key: 'Camera', icon: 'camera', label: '', routeName: 'Camera' },
    { key: 'Recipes', icon: 'restaurant-outline', label: 'Công thức', routeName: 'Recipes' },
    { key: 'Profile', icon: 'person-outline', label: 'Hồ sơ', routeName: 'Profile' },
  ];

  const focusedRoute = state.routes[state.index]?.name;
  if (focusedRoute === 'Camera') {
    return null;
  }

  // Hàm xử lý khi bấm vào tab
  const handleTabPress = (routeName, isFocused) => {
    if (routeName === 'Home' && isFocused) {
      // Nếu đang ở Home và bấm lại tab "Nhật ký", refresh màn hình
      const routeIndex = state.routes.findIndex(r => r.name === routeName);
      const descriptor = descriptors[routeIndex];
      if (descriptor?.navigation) {
        // Emit focus event để trigger refresh trong HomeScreen
        descriptor.navigation.emit('focus');
      }
      // Không navigate nếu đã đang ở màn hình đó, chỉ refresh
      return;
    }
    navigation.navigate(routeName);
  };

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
              onPress={() => handleTabPress(route.name, isFocused)}
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
              onPress={() => handleTabPress(route.name, isFocused)}
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
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ tabBarStyle: { display: 'none' } }}
        listeners={{
          tabPress: (e) => {
            // Khi bấm vào tab Home (Nhật ký), refresh màn hình
            // useFocusEffect trong HomeScreen sẽ tự động được trigger
          },
        }}
      />
      <Tab.Screen name="Analytics" component={AnalyzeScreen} />
      <Tab.Screen name="Camera" component={CameraCaptureScreen} />
      <Tab.Screen name="Recipes" component={RecipeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}


