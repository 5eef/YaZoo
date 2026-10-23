import test from 'node:test';
import assert from 'node:assert/strict';
import { videoPosts, mergeReels, canPlayReel, nextReelsBatch, publicPostLink } from '../src/features/social/reelsModel.ts';
import { primaryDestinations, secondaryDestinations, screens } from '../src/navigation/destinations.ts';
import { dictionaries } from '../src/i18n/messages.ts';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('primary Reels destination keeps professional discovery in secondary navigation', () => {
  assert.deepEqual(primaryDestinations, ['feed', 'reels', 'create-post', 'messages', 'user-profile']);
  assert.ok(screens.includes(primaryDestinations[1]));
  assert.ok(secondaryDestinations.includes('discover'));
});
test('only genuine video posts become Reels; pages merge without duplicating social ids', () => {
  const video = { id: 3, mediaKind: 'video', mediaUrl: '/storage/a.mp4', likes: 0 };
  assert.deepEqual(videoPosts([{ id: 1, mediaKind: 'image', mediaUrl: '/a.jpg' }, { id: 2, mediaKind: 'video' }, video]), [video]);
  const updated = { ...video, likes: 2 };
  assert.deepEqual(mergeReels([video], [updated, { ...video, id: 4 }]), [updated, { ...video, id: 4 }]);
  assert.deepEqual(mergeReels([], []), []);
});

test('sparse pages automatically scan until enough videos, the last page or a five-page bound', async () => {
  const video = id => ({ id, mediaKind: 'video', mediaUrl: '/storage/demo.webm' });
  const calls = [];
  const result = await nextReelsBatch(0, async page => { calls.push(page); return { data: page < 3 ? [{ id: page, mediaKind: 'image' }] : [video(10), video(11), video(12)], meta: { last_page: 9 } }; });
  assert.deepEqual(calls, [1, 2, 3]); assert.equal(result.posts.length, 3); assert.equal(result.hasMore, true);
  const bounded = await nextReelsBatch(0, async () => ({ data: [], meta: { last_page: 99 } }));
  assert.equal(bounded.scanned, 5); assert.equal(bounded.page, 5); assert.equal(bounded.hasMore, true);
  const empty = await nextReelsBatch(0, async () => ({ data: [], meta: { last_page: 1 } }));
  assert.equal(empty.scanned, 1); assert.equal(empty.hasMore, false); assert.deepEqual(empty.posts, []);
  let active = true, requests = 0;
  const stopped = await nextReelsBatch(0, async () => { requests++; active = false; return { data: [video(1)], meta: { last_page: 9 } }; }, () => active);
  assert.equal(requests, 1); assert.deepEqual(stopped.posts, []);
});
test('only the current foreground Reel plays, and comments or another destination stop it', () => {
  assert.deepEqual([0, 1, 2].filter(index => canPlayReel(index, 1, true, true, false)), [1]);
  for (const flags of [[false, true, false], [true, false, false], [true, true, true]]) assert.equal(canPlayReel(1, 1, ...flags), false);
});
test('sharing uses the same public post id and excludes local development links', () => {
  assert.equal(publicPostLink('https://yazoo.example', 123), 'https://yazoo.example/feed?post=123');
  for (const origin of ['http://127.0.0.1:8000', 'http://localhost:5173', 'http://192.168.1.2', 'file:///a', 'https://user:password@example.com']) assert.equal(publicPostLink(origin, 123), undefined);
});
test('Reels controls and empty state are translated in all supported locales', () => {
  for (const locale of ['fr', 'en', 'ar']) for (const key of ['reels', 'noReels', 'mute', 'unmute', 'play', 'pause', 'comments', 'like', 'share']) assert.ok(dictionaries[locale][key]);
  assert.notEqual(dictionaries.ar.reels, dictionaries.en.reels);
});

test('Reels screen paginates Feed videos, switches its sole player, reuses comments and opens the real author', async () => {
  let cursor = 0, background, calledAuthor, commented, calledVet;
  const slots = [], effects = [], calls = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useCallback: callback => callback,
    useEffect(callback, deps) { const index = cursor++; const prior = slots[index]; if (!prior || deps.some((value, i) => value !== prior[i])) { slots[index] = deps; effects.push(callback); } },
  };
  const video = id => ({ id, mediaKind: 'video', mediaUrl: `/storage/${id}.mp4`, author: { id: 40 + id, name: `Author ${id}` }, likes: 0, commentsCount: 0 });
  const mocks = {
    react: React,
    'react-native': { ...Object.fromEntries(['ActivityIndicator', 'FlatList', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map(key => [key, key])), AppState: { currentState: 'active', addEventListener: (_, callback) => { background = callback; return { remove() {} }; } }, Share: {} },
    'expo-router': { useFocusEffect: callback => { const index = cursor++; if (!slots[index]) { slots[index] = true; effects.push(callback); } } },
    expo: {}, 'expo-video': {}, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../../api/client': { api: async path => { if (path.startsWith('/veterinarians')) { assert.equal(path, '/veterinarians?per_page=50'); return { data: [{ id: 7, name: 'Different clinic name', owner: { id: 42 } }] }; } calls.push(path); const page = Number(new URL(`http://test${path}`).searchParams.get('page')); return { data: [video(page), { id: 20, mediaKind: 'image' }], meta: { current_page: page, last_page: 2 } }; } },
    '../../api/errors': { ApiError: class extends Error {}, failureKey: () => 'unexpected' },
    '../ui': { mediaUrl: value => value, Avatar: 'Avatar', Button: 'Button', Empty: 'Empty', Label: 'Label' },
    '../EdgeSwipeBack': { EdgeSwipeBack: 'EdgeSwipeBack' }, '../SocialVideo': { SocialVideo: 'SocialVideo' }, '../Icon': { Icon: 'Icon' }, '../../i18n/messages': { dictionaries },
    '../../theme/ThemeProvider': { useTheme: () => ({ colors: { page: '#fff', danger: '#900', brandText: '#739' } }) },
    '../../features/social/reelsModel': { canPlayReel, mergeReels, nextReelsBatch, publicPostLink },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL('../src/components/reels/ReelsScreen.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: name => mocks[name], URL });
  const walk = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(walk) : [tree, ...Object.values(tree.props || {}).flatMap(walk)];
  const find = (tree, type, label) => walk(tree).find(node => node.type === type && (!label || node.props.accessibilityLabel === label));
  const props = { openFeed() {}, prepareComments() {}, latestPost: post => ({ ...post, commentsCount: 1 }), locale: 'fr', getSnapshot: () => null, saveSnapshot() {}, openVet: id => { calledVet = id; }, openAuthor: async id => { calledAuthor = id; }, renderComments: post => { commented = post.id; return null; } };
  const render = () => { cursor = 0; return module.exports.ReelsScreen(props); };
  const flush = async () => { effects.splice(0).forEach(effect => effect()); await new Promise(resolve => setTimeout(resolve, 0)); };
  let tree = render(); await flush(); find(tree, 'View').props.onLayout({ nativeEvent: { layout: { height: 600 } } });
  tree = render(); await flush(); tree = render(); let list = find(tree, 'FlatList');
  assert.deepEqual(Array.from(list.props.data, post => post.id), [1, 2]);
  list.props.onEndReached(); list.props.onEndReached(); await flush(); tree = render(); list = find(tree, 'FlatList');
  assert.equal(calls.length, 2); assert.ok(calls[1].endsWith('page=2')); assert.deepEqual(Array.from(list.props.data, post => post.id), [1, 2]);
  list.props.onViewableItemsChanged({ viewableItems: [{ index: 1 }] }); tree = render(); await flush(); tree = render(); list = find(tree, 'FlatList');
  const cards = list.props.data.map((item, index) => list.props.renderItem({ item, index }));
  const rail = walk(cards[1]).find(node => node.type === 'View' && node.props.style?.gap === 12);
  const railActions = walk(rail).filter(node => node.type === 'Pressable'); assert.equal(railActions.length, 3); // private fixture has no share
  assert.ok(railActions.every(node => node.props.style.width === 48 && node.props.style.minHeight === 48));
  assert.deepEqual(walk(rail).filter(node => node.type === 'Text').map(node => node.props.children[0]), [0, 0]);
  const players = walk(cards).filter(node => node.type?.name === 'Player'); assert.equal(players.length, 1); assert.equal(players[0].props.post.id, 2);
  find(cards[1], 'Pressable', dictionaries.fr.profile).props.onPress(); assert.equal(calledVet, 7);
  find(cards[1], 'Pressable', `${dictionaries.fr.profile} Author 2`).props.onPress(); assert.equal(calledAuthor, 42);
  find(cards[1], 'Pressable', dictionaries.fr.commentPost).props.onPress(); tree = render(); assert.equal(commented, 2);
  find(tree, 'Modal').props.onRequestClose(); tree = render(); assert.equal(find(tree, 'Modal').props.visible, false); assert.equal(find(tree, 'FlatList').props.data[1].commentsCount, 1);
  background('background'); tree = render(); list = find(tree, 'FlatList'); assert.equal(walk(list.props.renderItem({ item: list.props.data[1], index: 1 })).filter(node => node.type?.name === 'Player').length, 0);
});
test('duplicate IDs collapse and posts that lose video media leave the Reels list', () => {
  const video = { id: 900, mediaKind: 'video', mediaUrl: '/video.mp4' };
  assert.equal(mergeReels([], [video, { ...video, likes: 2 }]).length, 1);
  assert.equal(mergeReels([], [video, { ...video, likes: 2 }])[0].likes, 2);
  assert.deepEqual(mergeReels([video], [{ ...video, mediaUrl: null }]), []);
});
