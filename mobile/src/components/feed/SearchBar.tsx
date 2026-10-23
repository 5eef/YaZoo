import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from '../Icon';
export function SearchBar({ value, placeholder, clearLabel, rtl, onChange, onClear }: { value: string; placeholder: string; clearLabel: string; rtl: boolean; onChange: (value: string) => void; onClear: () => void }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.form, borderRadius: 20, marginBottom: 6, paddingStart: 14 }}>
    <Icon name="discover" color={colors.brandText} size={22} />
    <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={colors.secondary} value={value} maxLength={80} onChangeText={onChange} style={{ flex: 1, minHeight: 52, padding: 12, color: colors.text, fontSize: 16, textAlign: rtl ? 'right' : 'left' }} />
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} onPress={onClear} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.secondary, fontSize: 25 }}>×</Text></Pressable>}
  </View>;
}
