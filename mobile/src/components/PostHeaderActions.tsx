import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { dictionaries, type Locale } from '../i18n/messages';

export function PostHeaderActions({ locale, owner, following, disabled, onEdit, onDelete, onFollow, onReport }: { locale: Locale; owner: boolean; following: boolean; disabled: boolean; onEdit: () => void; onDelete: () => void; onFollow: () => void; onReport: () => void }) {
  const { colors } = useTheme(); const t = dictionaries[locale];
  const actions = owner ? [{ icon: 'edit', label: t.edit, press: onEdit }, { icon: 'trash', label: t.delete, press: onDelete }] : [{ icon: following ? 'user-check' : 'user-plus', label: following ? t.unfollowUser : t.followUser, press: onFollow, selected: following }, { icon: 'flag', label: t.reportPost, press: onReport }];
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{actions.map(action => <Pressable key={action.icon} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={{ disabled, ...('selected' in action ? { selected: action.selected } : {}) }} disabled={disabled} onPress={action.press} hitSlop={2} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name={action.icon} size={23} color={'selected' in action && action.selected ? colors.brandText : colors.secondary} /></Pressable>)}</View>;
}
