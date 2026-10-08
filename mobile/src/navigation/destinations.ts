export type Screen = 'reels' | 'feed' | 'create-post' | 'post' | 'communities' | 'community' | 'user-profile' | 'notifications' | 'marketplace' | 'favorites' | 'discover' | 'appointments' | 'messages' | 'settings' | 'profile' | 'conversation' | 'services';
export const screens: Screen[] = ['reels', 'feed', 'create-post', 'post', 'communities', 'community', 'user-profile', 'notifications', 'marketplace', 'favorites', 'discover', 'appointments', 'messages', 'settings', 'profile', 'conversation', 'services'];
export const primaryDestinations = ['feed', 'reels', 'create-post', 'messages', 'user-profile'] as const;
export const secondaryDestinations = ['feed', 'discover', 'appointments', 'services', 'communities', 'marketplace', 'favorites', 'messages', 'user-profile', 'settings'] as const;
export const socialScreens = ['feed', 'create-post', 'post', 'communities', 'community', 'user-profile', 'notifications', 'marketplace', 'favorites'] as const;
