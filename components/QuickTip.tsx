import React from 'react';
import { View, Text } from 'react-native';

export default function QuickTip() {
  return (
    <View className="mx-4 my-2 p-3 bg-green-50 rounded-xl border border-green-200">
      <Text className="text-green-800 text-sm font-bold">💡 Quick Tip</Text>
      <Text className="text-green-700 text-xs leading-5">
        The 75% rule means for every 3 classes you miss, you need to attend 9 more to compensate. 
        Green bars are above 77% (safe zone), amber at 75–77% (at risk), and red means immediate action needed.
      </Text>
    </View>
  );
}