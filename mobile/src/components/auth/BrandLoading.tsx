import React from 'react';
import { Image, View } from 'react-native';

export function BrandLoading({ backgroundColor }: { backgroundColor: string }) {
  return <View style={{ flex: 1, backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
    <Image source={require('../../../assets/brand/yazoo-symbol.png')} accessibilityLabel="YaZoo" accessible resizeMode="contain" style={{ width: 200, height: 200, borderRadius: 28 }} />
  </View>;
}
