import React from 'react';
import Svg, { Path } from 'react-native-svg';
// Same outline paths as frontend/src/components/ui/AppIcon.jsx.
const paths: Record<string, string> = {
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  'eye-off': 'M3 3l18 18 M10 5h2c7 0 10 7 10 7l-3 4 M6 6l-4 6s3 7 10 7l5-1 M9 9a4 4 0 0 0 6 6',
  logout: 'M10 4H4v16h6 M10 12h12 M17 7l5 5-5 5',
  edit: 'M4 20l4-1 12-12-3-3L5 16l-1 4Z M14 7l3 3',
  trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  'user-plus': 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21v-2a7 7 0 0 1 14 0 M19 8v8 M15 12h8',
  'user-check': 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M2 21v-2a7 7 0 0 1 14 0 M16 12l2 2 4-5',
  flag: 'M5 21V3 M5 4c5-4 9 4 15 0v10c-6 4-10-4-15 0',
  verified: 'M12 3 15 5l3 1 1 3 2 3-2 3-1 3-3 1-3 2-3-2-3-1-1-3-2-3 2-3 1-3 3-1 3-2Z M8 12l3 3 5-6',
  heart: 'M12 20 4.5 12.5a4.8 4.8 0 0 1 7.5-6 4.8 4.8 0 0 1 7.5 6L12 20Z',
  share: 'M14 4h6v6 M20 4 10 14 M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5',
  play: 'M8 5 19 12 8 19V5Z',
  sound: 'M4 9h4l5-4v14l-5-4H4V9Z M17 8a6 6 0 0 1 0 8 M20 5a10 10 0 0 1 0 14',
  muted: 'M4 9h4l5-4v14l-5-4H4V9Z M17 9l5 6 M22 9l-5 6',
  retry: 'M20 7v5h-5 M20 12a8 8 0 1 0-2 6',
  reels: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M10 8l6 4-6 4V8Z',
  feed: 'M3.75 10.5 12 4.5l8.25 6v8.25a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-4.5v6h-4.5a1.5 1.5 0 0 1-1.5-1.5V10.5Z',
  messages: 'M7.5 16.5 4.5 19.5v-12A2.25 2.25 0 0 1 6.75 5.25h10.5A2.25 2.25 0 0 1 19.5 7.5v6A2.25 2.25 0 0 1 17.25 15.75H7.5Z',
  notifications: 'M14.25 18.75a2.25 2.25 0 1 1-4.5 0m7.5-6v-1.5a5.25 5.25 0 1 0-10.5 0v1.5L5.25 15v1.5h13.5V15l-1.5-2.25Z',
  menu: 'M4.5 7.5h15m-15 4.5h15m-15 4.5h15', close: 'm6.75 6.75 10.5 10.5m0-10.5-10.5 10.5',
  discover: 'm16.5 16.5 3.75 3.75m-1.5-8.625a7.125 7.125 0 1 1-14.25 0 7.125 7.125 0 0 1 14.25 0Z',
  communities: 'M8.25 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5 1.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z M2.75 18.75a5.5 5.5 0 0 1 11 0m.5-3.75a4.5 4.5 0 0 1 7 3.75',
  marketplace: 'M4.5 9.75h15l-1.125-4.5H5.625l-1.125 4.5Z M6 9.75v9h12v-9M9 18.75v-5.25h6v5.25',
  appointments: 'M5.25 5.25h13.5a1.5 1.5 0 0 1 1.5 1.5v12H3.75v-12a1.5 1.5 0 0 1 1.5-1.5Z M7.5 3.75v3m9-3v3m-12.75 3h16.5m-12 3h2.25m3 0h2.25m-7.5 3h2.25m3 0h2.25',
  'create-post': 'M12 4.5v15m7.5-7.5h-15',
  'user-profile': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8a8 8 0 0 1 16 0',
  settings: 'M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z M12 3.75l2 2 3-.5 2 3-.5 3 2 2-2 2 .5 3-3 2-3-.5-2 2-2-2-3 .5-2-3 .5-3-2-2 2-2-.5-3 3-2 3 .5 2-2Z',
  favorites: 'M12 20 4.5 12.5a4.8 4.8 0 0 1 7.5-6 4.8 4.8 0 0 1 7.5 6L12 20Z',
};
export function Icon({ name, color, size = 24, filled = false }: { name: string; color: string; size?: number; filled?: boolean }) { return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}><Path d={paths[name] || paths['create-post']} fill={filled ? color : 'none'} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
