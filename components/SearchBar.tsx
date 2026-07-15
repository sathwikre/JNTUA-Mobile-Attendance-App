import React from 'react';
import { TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search subject…' }: Props) {
  return (
    <View className="px-5 mb-3">
      <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200" style={{ elevation: 1 }}>
        <Search size={18} color="#94A3B8" />
        <TextInput
          className="flex-1 px-3 text-base text-slate-900"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel="Search subjects"
        />
      </View>
    </View>
  );
}