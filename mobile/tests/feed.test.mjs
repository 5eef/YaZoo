import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { resolveMediaUrl } from '../src/api/media.ts';
import { feedRows, storyRail, searchSections, mergeProfessionals, TOP_THRESHOLD } from '../src/features/social/feedModel.ts';
import { dictionaries } from '../src/i18n/messages.ts';

const colors = new Proxy({}, { get: () => '#7c3aed' });
function harness(path, extra = {}) {
  let cursor = 0; const slots = []; const effects = []; const scrolls = [];
  const React = {
    useCallback: callback => callback,
    createElement(type, props, ...children) { if (typeof type === 'function' && type.name === 'SearchBar') return type(props); if (props?.ref) props.ref.current = { scrollToOffset: value => scrolls.push(value) }; return { type, props: { ...props, children } }; },
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useEffect(callback, deps) { const index = cursor++; const previous = slots[index]; if (!previous || deps.some((value, i) => value !== previous.deps[i])) { previous?.cleanup?.(); const effect = { deps }; slots[index] = effect; effects.push(() => { effect.cleanup = callback(); }); } },
  };
  const mocks = { './SocialVideo': { SocialVideo: 'SocialVideo' }, './Icon': { Icon: 'Icon' }, '../i18n/messages': { dictionaries }, react: React, 'react-native': new Proxy({}, { get: (_, name) => name }), '../../api/client': { api: async () => ({ data: [] }) }, '../../api/errors': { ApiError: class ApiError extends Error {}, errorKey: () => 'offline' }, '../../i18n/messages': { dictionaries }, '../../theme/ThemeProvider': { useTheme: () => ({ colors }) }, '../theme/ThemeProvider': { useTheme: () => ({ colors }) }, '../ui': new Proxy({}, { get: (_, name) => name }), '../Media': { Media: 'Media' }, '../ProfessionalCard': { ProfessionalCard: 'ProfessionalCard' }, './StoriesRail': { StoriesRail: 'StoriesRail' }, '../Icon': { Icon: 'Icon' }, '../../features/social/feedModel': { feedRows, searchSections, TOP_THRESHOLD, storyRail, mergeProfessionals }, '../../theme/tokens': { palette: { brand: '#7c3aed', soft: '#a855f7' } }, 'expo-linear-gradient': { LinearGradient: 'Gradient' }, ...extra };
  const module = { exports: {} };
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, { module, exports: module.exports, require: name => { if (name === './SearchBar') { const child = { exports: {} }; vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/feed/SearchBar.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, { module: child, exports: child.exports, require: key => mocks[key] }); return child.exports; } if (!(name in mocks)) throw Error('Missing mock '+name); return mocks[name]; }, setTimeout, clearTimeout, URL, __DEV__: false });
  return { render(component, props) { cursor = 0; return (typeof component === 'function' ? component : module.exports[component])(props); }, effects() { effects.splice(0).forEach(effect => effect()); }, scrolls, exports: module.exports };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...Object.values(tree.props || {}).flatMap(nodes)]; }
function find(tree, type, label) { return nodes(tree).find(node => node.type === type && (!label || node.props.accessibilityLabel === label)); }
const props = { locale: 'fr', user: { id: 1, name: 'Owner' }, posts: [{ id: 1 }], groups: [], marketplace: true, communities: true, renderPost: () => null, refresh: async () => {}, more: async () => {}, hasMore: false, onStory() {}, createStory() {}, compose() {}, discover() {}, openVet() {}, openResult() {} };

test('Feed viewability chooses one video, pauses the previous/offscreen post and respects Story overlay', () => {
  const h = harness('../src/components/feed/FeedScreen.tsx'); const played = [];
  const videos = [{ id: 1, mediaKind: 'video' }, { id: 2, mediaKind: 'video' }];
  const p = { ...props, posts: videos, renderPost: (post, playback) => played.push({ id: post.id, ...playback }) };
  let tree = h.render('FeedScreen', p); let list = find(tree, 'FlatList');
  const rows = videos.map(post => ({ kind: 'post', post }));
  list.props.onViewableItemsChanged({ viewableItems: rows.map(item => ({ item })) }); tree = h.render('FeedScreen', p); list = find(tree, 'FlatList');
  rows.forEach(item => list.props.renderItem({ item })); assert.deepEqual(played.filter(item => item.active).map(item => item.id), [1]); assert.equal(played[0].muted, true);
  played.length = 0; list.props.onViewableItemsChanged({ viewableItems: [{ item: rows[1] }] }); tree = h.render('FeedScreen', p); list = find(tree, 'FlatList'); rows.forEach(item => list.props.renderItem({ item })); assert.deepEqual(played.filter(item => item.active).map(item => item.id), [2]);
  played.length = 0; tree = h.render('FeedScreen', { ...p, playbackEnabled: false }); list = find(tree, 'FlatList'); rows.forEach(item => list.props.renderItem({ item })); assert.equal(played.some(item => item.active), false);
  played.length = 0; list.props.onViewableItemsChanged({ viewableItems: [] }); tree = h.render('FeedScreen', p); list = find(tree, 'FlatList'); rows.forEach(item => list.props.renderItem({ item })); assert.equal(played.some(item => item.active), false);
});

test('search preserves successful results when the supplementary specialty lookup fails', async () => {
  const h = harness('../src/components/feed/FeedScreen.tsx', { '../../api/client': { api: async path => {
    if (path.includes('specialty=')) throw Error('temporary specialty lookup failure');
    return path.startsWith('/search') ? { data: { veterinarians: [{ id: 4, name: 'Real vet' }] } } : { data: [] };
  } } });
  let tree = h.render('FeedScreen', props); h.effects();
  find(tree, 'TextInput').props.onChangeText('vaccin'); tree = h.render('FeedScreen', props); h.effects();
  await new Promise(resolve => setTimeout(resolve, 340)); tree = h.render('FeedScreen', props);
  assert.equal(find(tree, 'FlatList').props.data.find(row => row.kind === 'result').result.id, 4);
  assert.equal(nodes(tree).some(node => node.props?.accessibilityRole === 'alert'), false);
});

test('stories preserve server order and always expose a real own creation shortcut', () => {
  const groups = [{ id: '2', user: { id: 2, name: 'Vet' }, stories: [{ id: 4 }], hasUnviewed: true }];
  const rail = storyRail(groups, props.user); assert.equal(rail[0].user.id, 1); assert.deepEqual(rail[0].stories, []); assert.equal(rail[1], groups[0]);
  assert.equal(storyRail([rail[1], rail[0]], props.user).length, 2);
  let created = 0, opened;
  const h = harness('../src/components/feed/StoriesRail.tsx');
  const tree = h.render('StoriesRail', { groups, user: props.user, ownLabel: 'Own', createLabel: 'Create', openLabel: 'Stories', onCreate: () => created++, onOpen: group => opened = group });
  const list = find(tree, 'FlatList'); const own = list.props.renderItem({ item: list.props.data[0] }); find(own, 'Pressable', 'Create').props.onPress(); assert.equal(created, 1);
  const other = list.props.renderItem({ item: groups[0] }); find(other, 'Pressable', 'Stories Vet').props.onPress(); assert.equal(opened, groups[0]);
});
test('business blocks follow social posts and absent data produces no empty rails', () => {
  const posts = Array.from({ length: 7 }, (_, index) => ({ id: index }));
  assert.deepEqual(feedRows(posts, ['vets', 'services', 'offers']).map(row => row.kind), ['post', 'post', 'vets', 'post', 'post', 'services', 'post', 'post', 'offers', 'post']);
  assert.equal(feedRows(posts, []).length, 7);
});
test('search groups professionals before services, offers and posts and respects marketplace flag', () => {
  const results = { posts: [{ id: 1 }], veterinarians: [{ id: 2 }], products: [{ id: 3 }], services: [{ id: 4 }] };
  assert.deepEqual(searchSections(results, true).map(section => section.key), ['veterinarians', 'services', 'products', 'posts']);
  assert.deepEqual(searchSections(results, false).map(section => section.key), ['veterinarians', 'services', 'posts']);
  const matched = mergeProfessionals([{ id: 2, name: 'Vet' }], [{ id: 2, name: 'Vet', specialties: ['Vaccination'], owner: { id: 4, isProfessionalVerified: true } }, { id: 3, name: 'Another vet' }]);
  assert.equal(matched.length, 2); assert.deepEqual(matched[0].specialties, ['Vaccination']);
});
test('feed input clears search, has no language or normal refresh buttons, and uses native refresh', async () => {
  let refreshed = 0; const h = harness('../src/components/feed/FeedScreen.tsx');
  let tree = h.render('FeedScreen', { ...props, refresh: async () => refreshed++ });
  const input = find(tree, 'TextInput', dictionaries.fr.searchYaZoo); assert.ok(input);
  assert.equal(nodes(tree).filter(node => ['FR', 'AR', 'EN', dictionaries.fr.refresh].includes(node.props?.label)).length, 0);
  input.props.onChangeText('vaccin'); tree = h.render('FeedScreen', { ...props, refresh: async () => refreshed++ }); assert.equal(find(tree, 'TextInput').props.value, 'vaccin');
  find(tree, 'Pressable', dictionaries.fr.clearSearch).props.onPress(); tree = h.render('FeedScreen', { ...props, refresh: async () => refreshed++ }); assert.equal(find(tree, 'TextInput').props.value, '');
  const before = find(tree, 'FlatList').props.keyExtractor({ key: 'post-1' }); const control = find(tree, 'RefreshControl'); control.props.onRefresh(); control.props.onRefresh(); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(refreshed, 1); tree = h.render('FeedScreen', props); assert.notEqual(find(tree, 'FlatList').props.keyExtractor({ key: 'post-1' }), before);
});
test('scroll threshold controls floating arrow and tap scrolls smoothly to top', () => {
  const h = harness('../src/components/feed/FeedScreen.tsx'); let tree = h.render('FeedScreen', props);
  assert.equal(find(tree, 'Pressable', dictionaries.fr.scrollTop), undefined);
  find(tree, 'FlatList').props.onScroll({ nativeEvent: { contentOffset: { y: 601 } } }); tree = h.render('FeedScreen', props);
  find(tree, 'Pressable', dictionaries.fr.scrollTop).props.onPress(); assert.equal(h.scrolls.at(-1).offset, 0); assert.equal(h.scrolls.at(-1).animated, true);
  find(tree, 'FlatList').props.onScroll({ nativeEvent: { contentOffset: { y: 20 } } }); tree = h.render('FeedScreen', props); assert.equal(find(tree, 'Pressable', dictionaries.fr.scrollTop), undefined);
});
test('story slide navigation arrows retain accessible targets and reverse only for RTL', () => {
  const h = harness('../src/components/BackButton.tsx'); let back = 0;
  for (const rtl of [false, true]) { const tree = h.render('BackButton', { rtl, label: 'Back', onPress: () => back++ }); assert.equal(find(tree, 'Text').props.children[0], rtl ? '\u2192' : '\u2190'); assert.equal(find(tree, 'Pressable').props.style.minHeight, 48); find(tree, 'Pressable').props.onPress(); }
  assert.equal(back, 2);
});
test('media resolves storage and private paths using API origin, preserves remote images and rejects unsafe URLs', () => {
  const base = 'http://127.0.0.1:8000/api';
  assert.equal(resolveMediaUrl('/storage/image.jpg', base), 'http://127.0.0.1:8000/storage/image.jpg');
  assert.equal(resolveMediaUrl('marketplace/demo/service.png', base), 'http://127.0.0.1:8000/storage/marketplace/demo/service.png');
  assert.equal(resolveMediaUrl('http://localhost/storage/image.jpg', base), 'http://127.0.0.1:8000/storage/image.jpg');
  assert.equal(resolveMediaUrl('/api/media/private/abc', base), 'http://127.0.0.1:8000/api/media/private/abc');
  assert.equal(resolveMediaUrl('https://cdn.example.test/photo.jpg', base), 'https://cdn.example.test/photo.jpg');
  for (const value of ['file:///etc/passwd', 'javascript:alert(1)', 'https://u:p@cdn.test/x']) assert.equal(resolveMediaUrl(value, base), undefined);
});

test('typing debounces real requests, clearing ignores an in-flight response and failures end loading', async () => {
  const calls = []; let resolveSearch;
  const h = harness('../src/components/feed/FeedScreen.tsx', { '../../api/client': { api: path => {
    if (!path.startsWith('/search')) return Promise.resolve({ data: [] });
    calls.push(path); return new Promise(resolve => { resolveSearch = resolve; });
  } } });
  let tree = h.render('FeedScreen', props); h.effects();
  find(tree, 'TextInput').props.onChangeText('va'); tree = h.render('FeedScreen', props); h.effects();
  find(tree, 'TextInput').props.onChangeText('vaccin'); tree = h.render('FeedScreen', props); h.effects();
  assert.equal(calls.length, 0); await new Promise(resolve => setTimeout(resolve, 340));
  assert.equal(calls.length, 1); assert.ok(calls[0].includes('q=vaccin'));
  tree = h.render('FeedScreen', props);
  find(tree, 'TextInput').props.onChangeText('vaccin'); tree = h.render('FeedScreen', props); h.effects();
  resolveSearch({ data: { veterinarians: [{ id: 1, name: 'Current vet' }] } }); await new Promise(resolve => setTimeout(resolve, 0));
  tree = h.render('FeedScreen', props); assert.equal(find(tree, 'ActivityIndicator'), undefined);
  assert.ok(find(tree, 'FlatList').props.data.some(row => row.result?.name === 'Current vet'));
  find(tree, 'TextInput').props.onChangeText('chat'); tree = h.render('FeedScreen', props); h.effects();
  await new Promise(resolve => setTimeout(resolve, 340));
  find(tree, 'Pressable', dictionaries.fr.clearSearch).props.onPress(); tree = h.render('FeedScreen', props); h.effects();
  resolveSearch({ data: { veterinarians: [{ id: 1, name: 'Stale vet' }] } }); await new Promise(resolve => setTimeout(resolve, 0));
  tree = h.render('FeedScreen', props); assert.equal(find(tree, 'TextInput').props.value, ''); assert.equal(find(tree, 'ActivityIndicator'), undefined);
  const failed = harness('../src/components/feed/FeedScreen.tsx', { '../../api/client': { api: async path => { if (path.startsWith('/search')) throw Error('offline'); return { data: [] }; } } });
  tree = failed.render('FeedScreen', props); failed.effects(); find(tree, 'TextInput').props.onChangeText('chat'); tree = failed.render('FeedScreen', props); failed.effects();
  await new Promise(resolve => setTimeout(resolve, 340)); tree = failed.render('FeedScreen', props);
  assert.equal(find(tree, 'ActivityIndicator'), undefined); assert.ok(nodes(tree).some(node => node.props?.accessibilityRole === 'alert'));
});

test('post images keep source dimensions and expose a fallback only after an actual failure', () => {
  const h = harness('../src/components/Media.tsx', { './ui': { Label: 'Label', mediaUrl: value => value }, '../api/client': { mediaHeaders: () => ({ Authorization: 'Bearer test' }) }, 'expo-video': { useVideoPlayer: () => ({}), VideoView: 'VideoView' } });
  const media = h.render('Media', { uri: 'http://127.0.0.1:8000/api/media/private/demo', label: 'Post image', fallback: 'Failed' });
  let photo = h.render(media.type, media.props); const image = find(photo, 'Image'); assert.equal(image.props.resizeMode, 'contain'); assert.equal(image.props.source.headers.Authorization, 'Bearer test');
  image.props.onLoad({ nativeEvent: { source: { width: 640, height: 400 } } }); photo = h.render(media.type, media.props); assert.equal(find(photo, 'Image').props.style.aspectRatio, 1.6); assert.equal(find(photo, 'ActivityIndicator'), undefined);
  find(photo, 'Image').props.onError(); photo = h.render(media.type, media.props); assert.equal(find(photo, 'Image'), undefined); assert.equal(find(photo, 'Label').props.children[0], 'Failed');
});

test('professional hero uses the real professional image and profile CTA', () => {
  let opened = 0;
  const h = harness('../src/components/ProfessionalCard.tsx', { './ui': { Avatar: 'Avatar', Button: 'Button', Card: 'Card', Label: 'Label', mediaUrl: value => value }, './Media': { Media: 'Media' } });
  const tree = h.render('ProfessionalCard', { professional: { id: 4, name: 'Vet', imageUrl: '/storage/vet.png', averageRating: 4.8, owner: { isProfessionalVerified: true } }, trust: 'Verified', action: 'Profile', onPress: () => opened++ });
  assert.equal(find(tree, 'Media').props.uri, '/storage/vet.png'); assert.equal(find(tree, 'Media').props.maxHeight, 180); find(tree, 'Button').props.onPress(); assert.equal(opened, 1);
});
