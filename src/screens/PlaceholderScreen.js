import React from 'react';
import { View, Text } from 'react-native';

export default function PlaceholderScreen({ route }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{route?.name}</Text>
    </View>
  );
}


