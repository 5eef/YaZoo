import React, { useMemo } from 'react';
import { Keyboard, PanResponder, View } from 'react-native';
import { capturesEdgeSwipe, completesEdgeSwipe } from '../navigation/edgeSwipe';

// PanResponder is already part of React Native; no extra native dependency is needed.
export function EdgeSwipeBack({ children, onBack, enabled = true }: { children: React.ReactNode; onBack: () => void; enabled?: boolean }) {
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, gesture) => enabled && capturesEdgeSwipe(gesture),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gesture) => {
      if (!enabled || !completesEdgeSwipe(gesture)) return;
      if (Keyboard.isVisible()) Keyboard.dismiss(); else onBack();
    },
  }), [enabled, onBack]);
  return <View style={{ flex: 1 }} {...responder.panHandlers}>{children}</View>;
}
