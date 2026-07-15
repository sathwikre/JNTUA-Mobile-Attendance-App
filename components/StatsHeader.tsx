import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  totalSubjects: number;
  avgPercent: number;
  totalPresent: number;
  totalDays: number;
}

export default function StatsHeader({ totalSubjects, avgPercent, totalPresent, totalDays }: Props) {
  const stats = [
    { label: 'Subjects', value: totalSubjects, color: 'text-blue-600' },
    { label: 'Avg Attendance', value: `${avgPercent}%`, color: avgPercent >= 75 ? 'text-green-600' : 'text-red-600' },
    { label: 'Attended', value: totalPresent, color: 'text-green-600' },
    { label: 'Conducted', value: totalDays, color: 'text-purple-600' },
  ];

  return (
    <View className="flex-row mx-4 -mt-4 mb-2">
      {stats.map((stat, i) => (
        <View
          key={i}
          className="flex-1 mx-1 bg-white rounded-xl shadow-sm p-3 items-center"
          style={{ elevation: 2 }}
        >
          <Text className={`text-lg font-bold ${stat.color}`}>{stat.value}</Text>
          <Text className="text-xs text-gray-500 font-medium">{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}