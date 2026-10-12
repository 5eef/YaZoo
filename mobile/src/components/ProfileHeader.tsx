import React from 'react';
import { Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, mediaUrl } from './ui';
import { ProfileActionsMenu } from './ProfileActionsMenu';
import { dictionaries, type Locale } from '../i18n/messages';
import type { Profile } from '../features/social/types';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/tokens';

type Props = { profile: Profile; locale: Locale; busy: boolean; children?: React.ReactNode;
  onAvatar: () => void; onCover: () => void; onEdit: () => void; onSettings: () => void; onWeb: () => void };

export function ProfileHeader({ profile, locale, busy, children, ...actions }: Props) {
  const { colors } = useTheme();
  const t = dictionaries[locale];
  const rtl = locale === 'ar';
  const textStyle = { color: colors.text, fontSize: 16, lineHeight: 25, textAlign: rtl ? 'right' as const : 'left' as const, writingDirection: rtl ? 'rtl' as const : 'ltr' as const };
  const cover = mediaUrl(profile.coverPhoto);
  return <View testID="profile-header" style={{ direction: rtl ? 'rtl' : 'ltr', borderRadius: radius.card, overflow: 'hidden', marginBottom: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
    <LinearGradient colors={['#5b21b6', '#8b5cf6', '#ddd6fe']} style={{ height: 150 }}>
      {cover && <Image source={{ uri: cover }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />}
    </LinearGradient>
    <View style={{ padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -54, marginBottom: spacing.sm, gap: spacing.md }}>
        <Avatar name={profile.name} uri={profile.avatar} size={80} />
        {profile.isOwner && <ProfileActionsMenu locale={locale} disabled={busy} {...actions} />}
      </View>
      <Text style={[textStyle, { fontSize: 24, lineHeight: 32, fontWeight: '800' }]}>{profile.name}</Text>
      {!!profile.city && <Text style={[textStyle, { color: colors.secondary }]}>{profile.city}</Text>}
      {!!profile.bio && <Text style={textStyle}>{profile.bio}</Text>}
      {profile.isProfessionalVerified && <Text style={[textStyle, { fontSize: 13 }]}>{t.trust}</Text>}
      <View testID="profile-stats" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm }}>
        {[[profile.postsCount, t.posts], [profile.followersCount, t.followers], [profile.followingCount, t.following]].map(([count, label]) => <Text key={label} style={[textStyle, { fontSize: 13 }]}>{count} {label}</Text>)}
      </View>
      {children}
    </View>
  </View>;
}
