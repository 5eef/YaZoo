import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { dictionaries, type Locale } from '../i18n/messages';

export function PostActions({ locale, liked, likes, comments, onLike, onComment, onShare, onReactions, disabled = false }: { locale: Locale; liked: boolean; likes: number; comments: number; onLike: () => void; onComment: () => void; onShare: () => void; onReactions?: () => void; disabled?: boolean }) {
  const { colors } = useTheme(); const t = dictionaries[locale];
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
    {[{ icon: 'heart', label: liked ? t.unlikePost : t.likePost, count: likes, press: onLike, selected: liked }, { icon: 'messages', label: t.commentPost, count: comments, press: onComment }, { icon: 'share', label: t.share, press: onShare }].map(action => <Pressable key={action.icon} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={{ disabled, ...(action.selected != null ? { selected: action.selected } : {}) }} disabled={disabled} onPress={action.press} onLongPress={action.icon === 'heart' ? onReactions : undefined} style={{ minWidth: 48, minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon name={action.icon} filled={action.selected} color={action.selected ? colors.brandText : colors.secondary} size={23} />{action.count != null && <Text style={{ fontSize: 13, color: colors.secondary }}>{action.count}</Text>}</Pressable>)}
  </View>;
}
