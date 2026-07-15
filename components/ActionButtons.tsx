import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { T, SP, COLORS, isSmall } from '../lib/tokens';

const buttons = [
  { label: 'Report', link: '/contact' },
  { label: 'Refresh', link: null },
  { label: 'Share', link: null },
  { label: 'Settings', link: null },
];

export default function ActionButtons() {
  const handlePress = (link: string | null) => {
    if (link) console.log('Navigate to:', link);
    else console.log('Coming soon');
  };

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {buttons.map((btn, i) => (
          <TouchableOpacity key={i} style={s.btn} onPress={() => handlePress(btn.link)} activeOpacity={0.7}>
            <View style={s.iconBox}>
              <Text style={s.iconLetter}>{btn.label.charAt(0)}</Text>
            </View>
            <Text style={s.label} numberOfLines={1}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 14, marginTop: SP.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { alignItems: 'center', flex: 1, marginHorizontal: SP.xs },
  iconBox: {
    width: isSmall ? 40 : 46, height: isSmall ? 40 : 46,
    borderRadius: isSmall ? 12 : 14, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: CARD_BORDER(), alignItems: 'center', justifyContent: 'center',
    elevation: 2, marginBottom: SP.xs,
  },
  iconLetter: { ...T.h3, color: COLORS.accent },
  label: { ...T.micro, color: COLORS.textMut },
});

function CARD_BORDER() { return '#F1F5F9'; }
