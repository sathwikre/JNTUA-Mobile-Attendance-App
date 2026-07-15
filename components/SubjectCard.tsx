import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useOTAConfig } from '../hooks/useOTAConfig';
import { T, SP, CARD, COLORS, isSmall } from '../lib/tokens';

interface Props {
  subject: string; code: string; total: number; present: number;
  absent: number; percentage: number; startDate: string | null;
  endDate: string | null; onPress?: () => void;
}

export default function SubjectCard({ subject, code, total, present, absent, percentage, startDate, endDate, onPress }: Props) {
  const { config } = useOTAConfig();
  const { thresholds, colors, labels } = config;

  let zone: 'safe' | 'caution' | 'risk' | 'danger' = 'danger';
  if (percentage >= thresholds.safe) zone = 'safe';
  else if (percentage >= thresholds.minimum) zone = 'caution';
  else if (percentage >= thresholds.warning) zone = 'risk';

  const pc = colors[zone];
  const pBg = zone === 'safe' ? '#DCFCE7' : zone === 'caution' ? '#FEF9C3' : zone === 'risk' ? '#FEF3C7' : '#FEE2E2';
  const sBg = zone === 'safe' ? COLORS.greenBg : zone === 'caution' ? '#FEFCE8' : zone === 'risk' ? COLORS.amberBg : COLORS.redBg;
  const sBd = zone === 'safe' ? COLORS.greenBorder : zone === 'caution' ? '#FEF08A' : zone === 'risk' ? COLORS.amberBorder : COLORS.redBorder;
  const sl = zone === 'safe' ? labels.safe : zone === 'caution' ? labels.caution : zone === 'risk' ? labels.risk : labels.low;

  const minPct = thresholds.minimum / 100;
  let canSkip = 0, needAttend = 0;
  if (total > 0) {
    if (percentage >= thresholds.minimum) { canSkip = Math.floor((present / minPct) - total); if (canSkip < 0) canSkip = 0; }
    else { needAttend = Math.ceil((minPct * total - present) / (1 - minPct)); if (needAttend < 0) needAttend = 0; }
  }

  const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : null;
  const pw = Math.min(percentage, 100);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={s.card}>
      {/* Top: name + badge */}
      <View style={s.top}>
        <View style={s.nameWrap}>
          <Text style={s.name} numberOfLines={1}>{subject}</Text>
          <View style={s.meta}>
            {code ? <View style={s.codeBadge}><Text style={s.codeText}>{code}</Text></View> : null}
            <Text style={s.metaText}>{total} hrs</Text>
          </View>
        </View>
        <View style={[s.badge, { backgroundColor: sBg, borderColor: sBd }]}>
          <Text style={[s.badgeText, { color: pc }]}>{sl}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={s.progRow}>
        <View style={[s.progTrack, { backgroundColor: pBg }]}>
          <View style={[s.progFill, { backgroundColor: pc, width: `${pw}%` }]} />
        </View>
        <Text style={[T.h1, { color: pc, marginLeft: SP.md, minWidth: 48, textAlign: 'right' }]}>{percentage}%</Text>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.stat}><Text style={s.statValGreen}>{present}</Text><Text style={s.statLabel}>Present</Text></View>
        <View style={s.statDiv} />
        <View style={s.stat}><Text style={s.statValRed}>{absent}</Text><Text style={s.statLabel}>Absent</Text></View>
        <View style={s.statDiv} />
        <View style={s.stat}><Text style={s.statValIndigo}>{total}</Text><Text style={s.statLabel}>Total</Text></View>
        {percentage >= thresholds.minimum && canSkip > 0 && (
          <><View style={s.statDiv} /><View style={s.stat}><View style={[s.actionPill, { backgroundColor: COLORS.greenBg, borderColor: COLORS.greenBorder }]}><Text style={[T.micro, { color: COLORS.greenDark }]}>Skip {canSkip}</Text></View></View></>
        )}
        {percentage < thresholds.minimum && needAttend > 0 && (
          <><View style={s.statDiv} /><View style={s.stat}><View style={[s.actionPill, { backgroundColor: COLORS.amberBg, borderColor: COLORS.amberBorder }]}><Text style={[T.micro, { color: COLORS.amberDark }]}>Need {needAttend}</Text></View></View></>
        )}
      </View>

      {dateRange && <Text style={[T.micro, { color: COLORS.textFaint, marginTop: SP.sm }]}>{dateRange}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { marginHorizontal: CARD.marginH, marginBottom: CARD.marginB, backgroundColor: CARD.bg, borderRadius: CARD.radius, borderWidth: 1, borderColor: CARD.border, padding: CARD.padding, elevation: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SP.lg },
  nameWrap: { flex: 1, marginRight: SP.md },
  name: { ...T.h2, color: COLORS.text },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: SP.xs, gap: SP.sm },
  codeBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: SP.md, paddingVertical: 2, borderRadius: 6 },
  codeText: { ...T.micro, color: COLORS.accent },
  metaText: { ...T.caption, color: COLORS.textMut },
  badge: { paddingHorizontal: SP.lg, paddingVertical: SP.xs, borderRadius: 20, borderWidth: 1 },
  badgeText: { ...T.micro },
  progRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SP.lg },
  progTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, paddingVertical: SP.sm, paddingHorizontal: SP.xs },
  stat: { flex: 1, alignItems: 'center' },
  statValGreen: { ...T.body, color: COLORS.green, fontWeight: '800' },
  statValRed: { ...T.body, color: COLORS.red, fontWeight: '800' },
  statValIndigo: { ...T.body, color: COLORS.indigo, fontWeight: '800' },
  statLabel: { ...T.nano, color: COLORS.textMut },
  statDiv: { width: 1, height: 18, backgroundColor: COLORS.borderLight },
  actionPill: { paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: 12, borderWidth: 1 },
});
