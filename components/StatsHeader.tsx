import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useOTAConfig } from '../hooks/useOTAConfig';
import { T, SP, CARD, COLORS, isSmall } from '../lib/tokens';

interface Props {
  totalSubjects: number;
  avgPercent: number;
  totalPresent: number;
  totalDays: number;
}

function ProgressRing({ percent, size, strokeWidth, ringColor, glowBg }: {
  percent: number; size: number; strokeWidth: number; ringColor: string; glowBg: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const offset = c - (c * percent) / 100;

  useEffect(() => {
    Animated.timing(anim, { toValue: percent, duration: 1200, useNativeDriver: false }).start();
  }, [percent]);

  const ASvg = Animated.createAnimatedComponent(Svg);
  const ACircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size + 14, height: size + 14, borderRadius: (size + 14) / 2, backgroundColor: glowBg, opacity: 0.6 }} />
      <ASvg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cx} r={r} stroke="#F1F5F9" strokeWidth={strokeWidth} fill="none" />
        <ACircle cx={cx} cy={cx} r={r} stroke={ringColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={anim.interpolate({ inputRange: [0, 100], outputRange: [c, offset] })}
          transform={`rotate(-90, ${cx}, ${cx})`} />
      </ASvg>
      <View style={{ alignItems: 'center', zIndex: 10 }}>
        <Text style={[T.hero, { color: ringColor }]}>{percent}%</Text>
        <Text style={s.ringLabel}>Overall</Text>
      </View>
    </View>
  );
}

export default function StatsHeader({ totalSubjects, avgPercent, totalPresent, totalDays }: Props) {
  const { config } = useOTAConfig();
  const { thresholds, colors, labels } = config;
  const ringSize = isSmall ? 112 : 132;
  const strokeW = isSmall ? 10 : 12;

  let zone: 'safe' | 'caution' | 'risk' | 'danger' = 'danger';
  if (avgPercent >= thresholds.safe) zone = 'safe';
  else if (avgPercent >= thresholds.minimum) zone = 'caution';
  else if (avgPercent >= thresholds.warning) zone = 'risk';

  const zc = colors[zone];
  const zl = zone === 'safe' ? labels.safe : zone === 'caution' ? labels.caution : zone === 'risk' ? labels.risk : labels.low;
  const glow = zone === 'safe' ? '#DCFCE7' : zone === 'caution' ? '#FEF9C3' : zone === 'risk' ? '#FEF3C7' : '#FEE2E2';
  const desc = zone === 'safe' ? `Above ${thresholds.minimum}% threshold` : zone === 'caution' ? `Just above ${thresholds.minimum}%` : zone === 'risk' ? `Below ${thresholds.minimum}% — attend more` : `Urgent — well below ${thresholds.minimum}%`;

  return (
    <View style={s.card}>
      <View style={s.topRow}>
        <View style={s.ringWrap}>
          <ProgressRing percent={avgPercent} size={ringSize} strokeWidth={strokeW} ringColor={zc} glowBg={glow} />
        </View>
        <View style={s.right}>
          <View style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: zc }]} />
            <Text style={[T.h2, { color: zc }]}>{zl}</Text>
          </View>
          <Text style={[T.caption, { color: COLORS.textMut, marginBottom: SP.lg }]}>{desc}</Text>
          <View style={s.pills}>
            <View style={s.pill}>
              <Text style={[T.h3, { color: colors.accent }]}>{totalSubjects}</Text>
              <Text style={s.pillLabel}>Subjects</Text>
            </View>
            <View style={s.pill}>
              <Text style={[T.h3, { color: colors.safe }]}>{totalPresent}</Text>
              <Text style={s.pillLabel}>Attended</Text>
            </View>
            <View style={s.pill}>
              <Text style={[T.h3, { color: colors.info }]}>{totalDays}</Text>
              <Text style={s.pillLabel}>Conducted</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: CARD.bg, marginHorizontal: CARD.marginH, marginTop: -16,
    borderRadius: CARD.radius, padding: CARD.padding,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
    borderWidth: 1, borderColor: '#F5F3FF',
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  ringWrap: { marginRight: SP.lg },
  ringLabel: { ...T.nano, color: COLORS.textMut, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  right: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: SP.sm },
  pills: { flexDirection: 'row', gap: SP.sm },
  pill: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 10,
    paddingVertical: SP.sm, paddingHorizontal: SP.xs,
    borderWidth: 1, borderColor: CARD.border, alignItems: 'center',
  },
  pillLabel: { ...T.nano, color: COLORS.textMut, textTransform: 'uppercase', letterSpacing: 0.3 },
});
