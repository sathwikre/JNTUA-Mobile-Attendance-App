import React from 'react';
import { View, TouchableOpacity, Text, Linking } from 'react-native';

const buttons = [
  { label: 'Report Issue', icon: '⚠️', link: '/contact' }
];

export default function ActionButtons() {
  const handlePress = (link: string | null) => {
    if (link) {
      // Navigate to the link – you can use expo-router or Linking
      console.log('Navigate to:', link);
    } else {
      console.log('Coming soon!');
    }
  };

  return (
    <View className="px-4 mt-2">
      <View className="flex-row flex-wrap justify-between">
        {buttons.map((btn, i) => (
          <TouchableOpacity
            key={i}
            className="bg-white rounded-full px-3 py-1.5 mb-2 border border-gray-200 shadow-sm"
            style={{ minWidth: '18%' }}
            onPress={() => handlePress(btn.link)}
          >
            <Text className="text-xs text-gray-700 text-center">
              {btn.icon} {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}