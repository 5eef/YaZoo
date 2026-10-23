import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../ui';
import { useTheme } from '../../theme/ThemeProvider';
import { palette } from '../../theme/tokens';
import { storyRail } from '../../features/social/feedModel';
import type { Person, StoryGroup } from '../../features/social/types';
export function StoriesRail({ groups, user, ownLabel, createLabel, openLabel, onOpen, onCreate }: { groups: StoryGroup[]; user: Person; ownLabel: string; createLabel: string; openLabel: string; onOpen: (group: StoryGroup) => void; onCreate: () => void }) {
  const { colors } = useTheme();
  return <FlatList horizontal data={storyRail(groups, user)} keyExtractor={group => String(group.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }} renderItem={({ item: group }) => {
    const own = group.user.id === user.id;
    return <View style={{ width: 118, alignItems: 'center' }}><Pressable accessibilityRole="button" accessibilityLabel={own && !group.stories.length ? createLabel : `${openLabel} ${group.user.name}`} onPress={() => group.stories.length ? onOpen(group) : onCreate()}>
      <LinearGradient colors={group.hasUnviewed || own ? [palette.brand, palette.soft] : [colors.border, colors.border]} style={{ width: 84, height: 84, borderRadius: 42, padding: 3, alignItems: 'center', justifyContent: 'center' }}><View style={{ padding: 3, borderRadius: 40, backgroundColor: colors.surface }}><Avatar name={group.user.name} uri={group.user.avatar} size={66} /></View></LinearGradient>
    </Pressable>{own && <Pressable accessibilityRole="button" accessibilityLabel={createLabel} hitSlop={6} onPress={onCreate} style={{ position: 'absolute', top: 40, end: 0, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandText, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.surface, fontSize: 23 }}>+</Text></Pressable>}<Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, marginTop: 6 }}>{own ? ownLabel : group.user.name}</Text></View>;
  }} />;
}
