import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

export default function Footer() {
  const openGitHub = () => {
    Linking.openURL('https://github.com/Chanikya-WebDev/JNTUA---Attendance-app');
  };

  return (
    <View className="items-center pt-4 pb-2">
      <Text className="text-xs text-gray-500 text-center">
        JNTUA Attendance App · 2026 ·{' '}
        <Text className="text-purple-600 font-medium" onPress={openGitHub}>
          Contribute on GitHub
        </Text>
      </Text>
    </View>
  );
}