import { Media } from './Media';
import React from 'react';
import { View } from 'react-native';
import { Avatar, Button, Card, Label, mediaUrl } from './ui';
import { useTheme } from '../theme/ThemeProvider';
import type { Vet } from '../features/types';

export function ProfessionalCard({ professional, action, onPress, trust }: { professional: Vet; action?: string; onPress?: () => void; trust: string }) {
  const { colors } = useTheme();
  const photo = mediaUrl(professional.imageUrl);
  return <Card>
    {photo && <Media uri={photo} label={professional.name} maxHeight={180} />}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar name={professional.name} uri={professional.imageUrl} size={52} />
      <View style={{ flex: 1 }}><Label>{professional.name}</Label><Label small muted>{[professional.clinicName, professional.city].filter(Boolean).join(' · ')}</Label></View>
    </View>
    {!!professional.specialties?.length && <Label small muted>{professional.specialties.join(' · ')}</Label>}
    {professional.averageRating != null && <Label small>{`★ ${professional.averageRating.toLocaleString()} / 5 · ${professional.reviewsCount || 0}`}</Label>}
    {professional.owner?.isProfessionalVerified && <View style={{ padding: 10, marginTop: 8, backgroundColor: colors.muted, borderRadius: 16 }}><Label small>{trust}</Label></View>}
    {action && onPress && <Button label={action} onPress={onPress} />}
  </Card>;
}
