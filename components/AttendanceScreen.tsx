import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientHeader from './GradientHeader';
import StatsHeader from './StatsHeader';
import SearchBar from './SearchBar';
import SubjectCard from './SubjectCard';
import QuickTip from './QuickTip';

interface AttendanceScreenProps {
  data: {
    semester: string;
    subjects: Array<{
      subject: string;
      code: string;
      total: number;
      present: number;
      absent: number;
      percentage: number;
      records: Array<{ date: string; status: string }>;
      error?: string;
    }>;
    overall: { totalDays: number; totalPresent: number; overallPercent: number };
    studentName?: string;
    studentId?: string;
  };
  onBack: () => void;
}

export default function AttendanceScreen({ data, onBack }: AttendanceScreenProps) {
  const [search, setSearch] = useState('');
  const studentName = data.studentName || 'Student';
  const studentId = data.studentId || '—';

  const filtered = useMemo(() => {
    if (!data?.subjects) return [];
    return data.subjects.filter((s) =>
      s.subject.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const renderItem = ({ item }: { item: any }) => (
    <SubjectCard
      subject={item.subject}
      code={item.code}
      total={item.total}
      present={item.present}
      absent={item.absent}
      percentage={item.percentage}
      startDate={item.records?.[0]?.date || null}
      endDate={item.records?.[item.records.length - 1]?.date || null}
      onPress={() => {
        console.log('Details for', item.subject);
      }}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <FlatList
        data={filtered}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
              <TouchableOpacity onPress={onBack} className="mr-3 p-1">
                <Text className="text-2xl text-gray-600">←</Text>
              </TouchableOpacity>
              <Text className="text-base font-semibold text-gray-800">Attendance Dashboard</Text>
            </View>
            <GradientHeader name={studentName} studentId={studentId} semester={data.semester} />
            <StatsHeader
              totalSubjects={data.subjects.length}
              avgPercent={data.overall.overallPercent}
              totalPresent={data.overall.totalPresent}
              totalDays={data.overall.totalDays}
            />
            <QuickTip />
            <View className="px-4 mt-2 mb-1">
              <Text className="text-sm font-bold text-gray-800">Subject‑wise Attendance</Text>
              <Text className="text-xs text-gray-500">{data.subjects.length} subjects</Text>
            </View>
            <SearchBar value={search} onChangeText={setSearch} />
          </>
        }
        ListEmptyComponent={
          <View className="py-12 items-center">
            <Text className="text-gray-500 text-base">No subjects match your search.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}