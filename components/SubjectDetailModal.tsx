import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOTAConfig } from '../hooks/useOTAConfig';
import { T, SP, CARD, COLORS, isSmall } from '../lib/tokens';

interface Record { date: string; status: string }
interface Props {
  visible: boolean; onClose: () => void; subject: string; code: string;
  percentage: number; present: number; absent: number; total: number; records: Record[];
}

export default function SubjectDetailModal({ visible, onClose, subject, code, percentage, present, absent, total, records }: Props) {
  const { config } = useOTAConfig();
  const { thresholds, colors } = config;

  let zone: 'safe' | 'caution' | 'risk' | 'danger' = 'danger';
  if (percentage >= thresholds.safe) zone = 'safe';
  else if (percentage >= thresholds.minimum) zone = 'caution';
  else if (percentage >= thresholds.warning) zone = 'risk';
  const pc = colors[zone];

  const minPct = thresholds.minimum / 100;
  let canSkip = 0, needAttend = 0;
  if (total > 0) {
    if (percentage >= thresholds.minimum) { canSkip = Math.floor((present / minPct) - total); if (canSkip < 0) canSkip = 0; }
    else { needAttend = Math.ceil((minPct * total - present) / (1 - minPct)); if (needAttend < 0) needAttend = 0; }
  }

  const renderItem = ({ item, index }: { item: Record; index: number }) => {
    const isP = item.status === 'Present';
    return (
      <View style={s.row}>
        <View style={s.rowIdx}><Text style={s.rowIdxText}>{index + 1}</Text></View>
        <Text style={s.rowDate}>{item.date}</Text>
        <View style={[s.rowPill, { backgroundColor: isP ? COLORS.greenBg : COLORS.redBg, borderColor: isP ? COLORS.greenBorder : COLORS.redBorder }]}>
          <Text style={[T.micro, { color: isP ? COLORS.greenDark : COLORS.redDark }]}>{item.status}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modal}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerSubject} numberOfLines={1}>{subject}</Text>
            {code ? <View style={s.codeBadge}><Text style={s.codeText}>{code}</Text></View> : null}
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>X</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={s.summary}>
          <View style={s.sumItem}><Text style={[T.h2, { color: pc }]}>{percentage}%</Text><Text style={s.sumLabel}>Attendance</Text></View>
          <View style={s.sumDiv} />
          <View style={s.sumItem}><Text style={[T.h2, { color: COLORS.green }]}>{present}</Text><Text style={s.sumLabel}>Present</Text></View>
          <View style={s.sumDiv} />
          <View style={s.sumItem}><Text style={[T.h2, { color: COLORS.red }]}>{absent}</Text><Text style={s.sumLabel}>Absent</Text></View>
          <View style={s.sumDiv} />
          <View style={s.sumItem}><Text style={[T.h2, { color: COLORS.indigo }]}>{total}</Text><Text style={s.sumLabel}>Total</Text></View>
        </View>

        {/* Action banner */}
        {percentage >= thresholds.minimum && canSkip > 0 && (
          <View style={s.banner}>
            <View style={[s.bannerInner, { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder }]}>
              <Text style={[T.body, { color: COLORS.greenDark, fontWeight: '700' }]}>
                Can skip {canSkip} class{canSkip > 1 ? 'es' : ''} and stay above {thresholds.minimum}%
              </Text>
            </View>
          </View>
        )}
        {percentage < thresholds.minimum && needAttend > 0 && (
          <View style={s.banner}>
            <View style={[s.bannerInner, { backgroundColor: COLORS.amberBg, borderColor: COLORS.amberBorder }]}>
              <Text style={[T.body, { color: COLORS.amberDark, fontWeight: '700' }]}>
                Need {needAttend} more class{needAttend > 1 ? 'es' : ''} to reach {thresholds.minimum}%
              </Text>
            </View>
          </View>
        )}

        {/* Records */}
        <View style={s.recHeader}>
          <Text style={T.h3}>Attendance Records</Text>
          <Text style={[T.micro, { color: COLORS.textMut }]}>{records.length} day{records.length !== 1 ? 's' : ''}</Text>
        </View>

        <FlatList
          data={records} keyExtractor={(_, i) => i.toString()} renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={s.empty}><Text style={[T.h3, { color: COLORS.textMut }]}>No records available</Text></View>}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  modal: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: CARD.padding, paddingVertical: SP.lg, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: CARD.border },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SP.md },
  headerSubject: { ...T.h2, color: COLORS.text },
  codeBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: SP.md, paddingVertical: 2, borderRadius: 6 },
  codeText: { ...T.micro, color: COLORS.accent },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  closeText: { ...T.body, color: COLORS.textMut, fontWeight: '800' },
  summary: { flexDirection: 'row', backgroundColor: COLORS.white, marginHorizontal: CARD.marginH, marginTop: SP.xl, borderRadius: CARD.radius, paddingVertical: SP.xl, borderWidth: 1, borderColor: CARD.border, elevation: 3 },
  sumItem: { flex: 1, alignItems: 'center' },
  sumLabel: { ...T.nano, color: COLORS.textMut, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
  sumDiv: { width: 1, height: 28, backgroundColor: CARD.border, alignSelf: 'center' },
  banner: { marginHorizontal: CARD.marginH, marginTop: SP.md },
  bannerInner: { paddingHorizontal: SP.xl, paddingVertical: SP.md, borderRadius: CARD.radius, borderWidth: 1 },
  recHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: CARD.marginH, marginTop: SP.xl, marginBottom: SP.sm },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: CARD.marginH, marginBottom: SP.sm, backgroundColor: COLORS.white, borderRadius: CARD.radius, paddingVertical: SP.lg, paddingHorizontal: SP.xl, borderWidth: 1, borderColor: CARD.border },
  rowIdx: { width: 26, height: 26, borderRadius: 8, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: SP.lg },
  rowIdxText: { ...T.micro, color: COLORS.textMut, fontWeight: '800' },
  rowDate: { flex: 1, ...T.body, color: COLORS.textSec },
  rowPill: { paddingHorizontal: SP.lg, paddingVertical: SP.xs, borderRadius: 20, borderWidth: 1 },
  empty: { paddingVertical: 48, alignItems: 'center' },
});
