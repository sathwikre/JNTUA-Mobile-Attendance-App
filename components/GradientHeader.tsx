import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOTAConfig } from '../hooks/useOTAConfig';
import { T, SP, COLORS, isSmall } from '../lib/tokens';

interface Props { name: string; studentId: string; semester: string; }

export default function GradientHeader({ name, studentId, semester }: Props) {
  const { config } = useOTAConfig();
  const accent = config.accentColor;
  const initial = name.charAt(0).toUpperCase();

  return (
    <View style={[s.wrap, { backgroundColor: accent }]}>
      <View style={s.decor} />
      <View style={s.row}>
        <View style={s.avatarRing}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{initial}</Text>
          </View>
        </View>
        <View style={s.info}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          <View style={s.badges}>
            <View style={s.idBadge}>
              <Text style={s.idLabel}>ID</Text>
              <Text style={s.idValue}>{studentId}</Text>
            </View>
            <View style={[s.semBadge, { borderColor: `${accent}55` }]}>
              <Text style={s.semText}>{semester}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={s.waveWrap}><View style={s.wave} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingTop: isSmall ? 12 : 14,
    paddingBottom: 26,
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  decor: {
    position: 'absolute', top: -24, right: -24,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatarRing: {
    width: isSmall ? 40 : 44,
    height: isSmall ? 40 : 44,
    borderRadius: isSmall ? 13 : 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 2,
    marginRight: SP.xl,
  },
  avatar: {
    flex: 1,
    borderRadius: isSmall ? 11 : 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#FFF', fontSize: isSmall ? 18 : 20, fontWeight: '900' },
  info: { flex: 1, justifyContent: 'center' },
  name: { color: '#FFF', fontSize: isSmall ? 18 : 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: SP.xs },
  badges: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  idBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: SP.md, paddingVertical: 2, borderRadius: 14, gap: 4,
  },
  idLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '800' },
  idValue: { fontSize: isSmall ? 11 : 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  semBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: SP.md, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  semText: { fontSize: isSmall ? 10 : 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  waveWrap: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 18 },
  wave: { flex: 1, backgroundColor: COLORS.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
});
