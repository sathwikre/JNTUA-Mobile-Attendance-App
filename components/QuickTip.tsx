import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOTAConfig } from '../hooks/useOTAConfig';
import { T, SP, CARD, COLORS, isSmall } from '../lib/tokens';

export default function QuickTip() {
  const { config } = useOTAConfig();
  const { thresholds, showQuickTip, quickTipText } = config;
  if (!showQuickTip) return null;

  const defaultTip = `The ${thresholds.minimum}% rule: for every 3 classes missed, you need 9 more to compensate. Green = above ${thresholds.safe}% (safe). Amber = ${thresholds.minimum}-${thresholds.safe}% (caution). Red = below ${thresholds.minimum}% (critical).`;
  const tipText = quickTipText || defaultTip;

  return (
    <View style={s.wrap}>
      <View style={s.iconBox}>
        <Text style={s.iconLetter}>i</Text>
      </View>
      <View style={s.textWrap}>
        <Text style={s.title}>Quick Tip</Text>
        <Text style={s.body}>{tipText}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: CARD.marginH, marginVertical: SP.sm,
    padding: CARD.padding, backgroundColor: COLORS.greenBg,
    borderRadius: CARD.radius, borderWidth: 1, borderColor: COLORS.greenBorder,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  iconBox: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center',
    marginRight: SP.md, marginTop: 1,
  },
  iconLetter: { fontSize: 13, fontWeight: '900', color: COLORS.greenDark },
  textWrap: { flex: 1 },
  title: { ...T.caption, color: '#166534', fontWeight: '800', marginBottom: 2 },
  body: { ...T.caption, color: '#15803D', lineHeight: isSmall ? 17 : 19 },
});
