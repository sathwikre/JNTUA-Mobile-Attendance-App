import React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { T, SP, CARD, COLORS, isSmall } from '../lib/tokens';

interface Props { value: string; onChangeText: (text: string) => void; placeholder?: string; }

export default function SearchBar({ value, onChangeText, placeholder = 'Search subject...' }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.box}>
        <Search size={isSmall ? 16 : 18} color={COLORS.textMut} />
        <TextInput style={s.input} placeholder={placeholder} placeholderTextColor={COLORS.textMut}
          value={value} onChangeText={onChangeText} accessibilityLabel="Search subjects" />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={s.clearBtn}>
            <Text style={s.clearText}>X</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

import { TouchableOpacity, Text } from 'react-native';

const s = StyleSheet.create({
  wrap: { paddingHorizontal: CARD.marginH, marginBottom: SP.md },
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: CARD.radius, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.white, paddingHorizontal: SP.xl, paddingVertical: isSmall ? SP.md : SP.lg, elevation: 1 },
  input: { flex: 1, paddingHorizontal: SP.md, ...T.body, color: COLORS.text },
  clearBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 10, color: COLORS.textMut, fontWeight: '700' },
});
