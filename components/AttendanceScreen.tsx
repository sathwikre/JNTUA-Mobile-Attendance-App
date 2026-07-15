import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OTAProvider } from '../context/OTAContext';
import GradientHeader from './GradientHeader';
import StatsHeader from './StatsHeader';
import SearchBar from './SearchBar';
import SubjectCard from './SubjectCard';
import QuickTip from './QuickTip';
import SubjectDetailModal from './SubjectDetailModal';
import { T, SP, CARD, COLORS, isSmall } from '../lib/tokens';

interface SubjectItem {
  subject: string; code: string; total: number; present: number;
  absent: number; percentage: number;
  records: Array<{ date: string; status: string }>; error?: string;
}

interface AttendanceScreenProps {
  data: { semester: string; subjects: SubjectItem[]; overall: { totalDays: number; totalPresent: number; overallPercent: number }; studentName?: string; studentId?: string };
  onBack: () => void;
  bundledScript: string;
}

export default function AttendanceScreen({ data, onBack, bundledScript }: AttendanceScreenProps) {
  return (
    <OTAProvider bundledScript={bundledScript}>
      <Inner data={data} onBack={onBack} />
    </OTAProvider>
  );
}

function Inner({ data, onBack }: Omit<AttendanceScreenProps, 'bundledScript'>) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SubjectItem | null>(null);
  const studentName = data.studentName || 'Student';
  const studentId = data.studentId || '--';

  const filtered = useMemo(() => {
    if (!data?.subjects) return [];
    return data.subjects.filter((s) => s.subject.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const ListHeader = (
    <>
      <GradientHeader name={studentName} studentId={studentId} semester={data.semester} />
      <StatsHeader totalSubjects={data.subjects.length} avgPercent={data.overall.overallPercent} totalPresent={data.overall.totalPresent} totalDays={data.overall.totalDays} />
      <QuickTip />
      <View style={s.sectionHead}>
        <View>
          <Text style={T.h3}>Subject-wise Attendance</Text>
          <Text style={[T.micro, { color: COLORS.textMut, marginTop: 1 }]}>{data.subjects.length} subjects / {filtered.length} shown</Text>
        </View>
        <View style={s.filterChip}><Text style={[T.micro, { color: COLORS.accent }]}>All</Text></View>
      </View>
      <SearchBar value={search} onChangeText={setSearch} />
    </>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.nav}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={T.h3}>Attendance Dashboard</Text>
        <View style={{ width: 34 }} />
      </View>
      <FlatList
        data={filtered} keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <SubjectCard subject={item.subject} code={item.code} total={item.total} present={item.present} absent={item.absent} percentage={item.percentage}
            startDate={item.records?.[0]?.date || null} endDate={item.records?.[item.records.length - 1]?.date || null}
            onPress={() => setSelected(item)} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<View style={s.empty}><Text style={[T.h2, { color: COLORS.textMut }]}>No subjects found</Text><Text style={[T.caption, { color: COLORS.textFaint, marginTop: SP.xs }]}>Try a different search term</Text></View>}
        contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      />
      <SubjectDetailModal visible={selected !== null} onClose={() => setSelected(null)}
        subject={selected?.subject || ''} code={selected?.code || ''} percentage={selected?.percentage || 0}
        present={selected?.present || 0} absent={selected?.absent || 0} total={selected?.total || 0} records={selected?.records || []} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: CARD.marginH, paddingVertical: SP.md, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: CARD.border },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 18, color: COLORS.textMut, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: CARD.marginH, marginTop: SP.md, marginBottom: SP.xs },
  filterChip: { backgroundColor: COLORS.accentLight, paddingHorizontal: SP.xl, paddingVertical: SP.xs, borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE' },
  empty: { paddingVertical: 48, alignItems: 'center' },
});
