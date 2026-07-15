import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  subject: string;
  code: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  startDate: string | null;
  endDate: string | null;
  onPress?: () => void;
}

export default function SubjectCard({
  subject,
  code,
  total,
  present,
  absent,
  percentage,
  startDate,
  endDate,
  onPress,
}: Props) {
  const isSafe = percentage >= 75;
  const isWarning = percentage >= 70 && percentage < 75;
  const isDanger = percentage < 70;

  const statusColor = isSafe ? 'text-green-600' : isWarning ? 'text-amber-600' : 'text-red-600';
  const statusBg = isSafe ? 'bg-green-100' : isWarning ? 'bg-amber-100' : 'bg-red-100';
  const statusLabel = isSafe ? '✅ Safe' : isWarning ? '⚠️ Risk' : '❌ Low';

  let canSkip = 0;
  let needAttend = 0;
  if (total > 0) {
    if (percentage >= 75) {
      canSkip = Math.floor((present / 0.75) - total);
      if (canSkip < 0) canSkip = 0;
    } else {
      needAttend = Math.ceil((0.75 * total - present) / 0.25);
      if (needAttend < 0) needAttend = 0;
    }
  }

  const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="mx-4 mb-2.5 bg-white rounded-xl border border-gray-200 shadow-sm p-3"
      style={{ elevation: 1 }}
    >
      <View className="flex-row items-start">
        {/* Percentage block */}
        <View className="w-16 items-center">
          <Text className={`text-2xl font-bold ${statusColor}`}>{percentage}%</Text>
          <Text className="text-xs text-gray-500 font-medium">ATTEND</Text>
        </View>

        {/* Middle block: subject details */}
        <View className="flex-1 ml-2">
          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>{subject}</Text>
          <View className="flex-row flex-wrap items-center mt-0.5">
            <Text className="text-xs text-gray-500 mr-2">{code}</Text>
            <Text className="text-xs text-gray-500 mr-2">{total} hrs total</Text>
            <Text className="text-xs text-green-600 mr-2">✔ {present} present</Text>
            <Text className="text-xs text-red-600">✘ {absent} absent</Text>
          </View>
          {dateRange && (
            <Text className="text-xs text-gray-400 mt-0.5">{dateRange}</Text>
          )}
        </View>

        {/* Right block: Can Skip / Need and status */}
        <View className="items-end ml-1">
          {percentage >= 75 && canSkip > 0 && (
            <View className="bg-green-100 px-2 py-0.5 rounded-full mb-1">
              <Text className="text-green-800 text-xs font-bold">Can Skip {canSkip}</Text>
            </View>
          )}
          {percentage < 75 && needAttend > 0 && (
            <View className="bg-amber-100 px-2 py-0.5 rounded-full mb-1">
              <Text className="text-amber-800 text-xs font-bold">Need {needAttend}</Text>
            </View>
          )}
          <View className={`px-2 py-0.5 rounded-full ${statusBg}`}>
            <Text className={`text-xs font-bold ${statusColor}`}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}