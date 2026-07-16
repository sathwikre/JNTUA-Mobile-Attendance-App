import { Search } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { CARD, COLORS, isSmall } from '../lib/tokens';

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

import { Text, TouchableOpacity } from 'react-native';

const s = StyleSheet.create({
  wrap: { paddingHorizontal: isSmall ? 12 : 16, marginBottom: isSmall ? 12 : 16 },
  box: { flexDirection: 'row', alignItems: 'center', borderRadius: CARD.radius, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.white, paddingHorizontal: isSmall ? 10 : 12, paddingVertical: isSmall ? 6 : 8, elevation: 1 },
  input: { flex: 1, paddingHorizontal: isSmall ? 6 : 8, fontSize: isSmall ? 12 : 14, color: COLORS.text },
  clearBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 10, color: COLORS.textMut, fontWeight: '700' },
});
