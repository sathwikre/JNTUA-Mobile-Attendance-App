import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  name: string;
  studentId: string;
  semester: string;
}

export default function GradientHeader({ name, studentId, semester }: Props) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <View className="px-4 pt-6 pb-5 bg-purple-700">
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center mr-3">
          <Text className="text-white text-xl font-bold">{initial}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-2xl font-bold">{name}</Text>
          <Text className="text-white/70 text-sm">Student ID: {studentId}</Text>
        </View>
      </View>
      <View className="mt-2">
        <Text className="text-white/60 text-xs font-medium">{semester}</Text>
      </View>
    </View>
  );
}