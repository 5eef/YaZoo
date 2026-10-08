import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { dictionaries } from '../src/i18n/messages.ts';
import { capturesEdgeSwipe, completesEdgeSwipe } from '../src/navigation/edgeSwipe.ts';
import { publicPostLink } from '../src/features/social/reelsModel.ts';
import { primaryDestinations, secondaryDestinations } from '../src/navigation/destinations.ts';

function harness(path, extra = {}) {
  let cursor = 0; const slots = [], effects = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useCallback: callback => callback, useMemo: callback => callback(),
    useEffect(callback, deps) { const index = cursor++; const prior = slots[index]; if (!prior || deps.some((value, i) => value !== prior.deps[i])) { prior?.cleanup?.(); const entry = { deps }; slots[index] = entry; effects.push(() => { entry.cleanup = callback(); }); } },
  };
  const native = Object.fromEntries(['View', 'Text', 'Pressable', 'ActivityIndicator', 'Modal', 'ScrollView', 'Image'].map(name => [name, name]));
  const mocks = { react: React, 'react-native': native, './Icon': { Icon: 'Icon' }, '../i18n/messages': { dictionaries }, '../api/client': { mediaHeaders: () => undefined }, '../theme/ThemeProvider': { useTheme: () => ({ colors: { text: '#222', secondary: '#777', brandText: '#7c3aed' } }) }, ...extra };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, { module, exports: module.exports, require: name => { assert.ok(name in mocks, `Missing mock ${name}`); return mocks[name]; }, URL, __DEV__: false });
  return { render(name, props) { cursor = 0; return module.exports[name](props); }, invoke(name, ...args) { cursor = 0; return module.exports[name](...args); }, flush() { effects.splice(0).forEach(effect => effect()); }, native };
}
function walk(tree) { return !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(walk) : [tree, ...Object.values(tree.props || {}).flatMap(walk)]; }
function find(tree, type, label) { return walk(tree).find(node => node.type === type && (!label || node.props.accessibilityLabel === label)); }

test('post header exposes only owner management or other-author relationship icons in every locale', () => {
  for (const locale of ['fr', 'en', 'ar']) {
    const h = harness('../src/components/PostHeaderActions.tsx'); const calls = [];
    const props = { locale, owner: true, following: false, disabled: false, onEdit: () => calls.push('edit'), onDelete: () => calls.push('delete'), onFollow: () => calls.push('follow'), onReport: () => calls.push('report') };
    let tree = h.render('PostHeaderActions', props);
    assert.deepEqual(walk(tree).filter(node => node.type === 'Icon').map(node => node.props.name), ['edit', 'trash']);
    find(tree, 'Pressable', dictionaries[locale].edit).props.onPress(); find(tree, 'Pressable', dictionaries[locale].delete).props.onPress();
    tree = h.render('PostHeaderActions', { ...props, owner: false });
    assert.deepEqual(walk(tree).filter(node => node.type === 'Icon').map(node => node.props.name), ['user-plus', 'flag']);
    find(tree, 'Pressable', dictionaries[locale].followUser).props.onPress(); find(tree, 'Pressable', dictionaries[locale].reportPost).props.onPress();
    assert.deepEqual(calls, ['edit', 'delete', 'follow', 'report']);
    assert.equal(walk(tree).filter(node => node.type === 'Text').length, 0);
    walk(tree).filter(node => node.type === 'Pressable').forEach(node => { assert.equal(node.props.style.width, 48); assert.equal(node.props.style.height, 48); });
    tree = h.render('PostHeaderActions', { ...props, owner: false, following: true, disabled: true });
    assert.equal(find(tree, 'Icon').props.name, 'user-check');
    const following = find(tree, 'Pressable', dictionaries[locale].unfollowUser); assert.equal(following.props.accessibilityState.selected, true); assert.equal(following.props.disabled, true);
  }
});

test('shell removes visible Back controls, keeps the Reels dock and enables only secondary edge navigation', () => {
  const h = harness('../src/navigation/YaZooShell.tsx', { '../components/EdgeSwipeBack': { EdgeSwipeBack: 'EdgeSwipeBack' }, '../components/Icon': { Icon: 'Icon' }, '../components/ui': { Avatar: 'Avatar', Button: 'Button', Label: 'Label' }, '../theme/tokens': { radius: {} }, './destinations': { primaryDestinations, secondaryDestinations }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'expo-linear-gradient': { LinearGradient: 'Gradient' }, '../../assets/yazoo-logo.webp': 'logo', 'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView', Image: 'Image', Keyboard: { dismiss() {} }, useWindowDimensions: () => ({ width: 400 }) } });
  let back = 0; const navigation = [];
  const props = { screen: 'post', backEnabled: true, onBack: () => back++, children: 'content', user: { name: 'QA' }, label: key => key, navigate: key => navigation.push(key), webLinks: [], communitiesEnabled: true };
  let tree = h.render('YaZooShell', props);
  assert.equal(find(tree, 'Pressable', 'back'), undefined); assert.equal(find(tree, 'Button', 'back'), undefined);
  const wrapper = find(tree, 'EdgeSwipeBack'); assert.equal(wrapper.props.enabled, true); wrapper.props.onBack(); assert.equal(back, 1);
  find(tree, 'Pressable', 'reels').props.onPress(); assert.deepEqual(navigation, ['reels']);
  tree = h.render('YaZooShell', { ...props, screen: 'reels', backEnabled: false }); assert.equal(find(tree, 'EdgeSwipeBack').props.enabled, false); assert.equal(find(tree, 'Gradient'), undefined); assert.ok(find(tree, 'Pressable', 'feed'));
});

test('social video has no native chrome, supports tap pause/resume and pauses offscreen/background', () => {
  let background, plays = 0, pauses = 0, status = 'readyToPlay';
  const player = { play() { plays++; }, pause() { pauses++; }, videoTrack: { size: { width: 360, height: 640 } }, replaceAsync: async () => {} };
  const native = { View: 'View', Pressable: 'Pressable', Text: 'Text', ActivityIndicator: 'Spinner', AppState: { currentState: 'active', addEventListener: (_, callback) => { background = callback; return { remove() {} }; } } };
  const h = harness('../src/components/SocialVideo.tsx', { 'react-native': native, expo: { useEvent: (_, name, initial) => name === 'statusChange' ? { status } : initial }, 'expo-video': { VideoView: 'VideoView', useVideoPlayer: (_, setup) => { setup(player); return player; } } });
  let ratio, mute = 0; const props = { uri: '/video.webm', active: true, muted: true, locale: 'fr', onRatio: value => { ratio = value; }, onMute: () => mute++ };
  let tree = h.render('SocialVideo', props); h.flush();
  assert.equal(find(tree, 'VideoView').props.nativeControls, false); assert.equal(find(tree, 'VideoView').props.pointerEvents, 'none'); assert.equal(plays, 1); assert.equal(ratio, 360 / 640);
  find(tree, 'Pressable', dictionaries.fr.pause).props.onPress(); tree = h.render('SocialVideo', props); h.flush(); assert.equal(pauses, 1); assert.ok(find(tree, 'Icon')); assert.ok(find(tree, 'Pressable', dictionaries.fr.play));
  find(tree, 'Pressable', dictionaries.fr.play).props.onPress(); tree = h.render('SocialVideo', props); h.flush(); assert.equal(plays, 2);
  find(tree, 'Pressable', dictionaries.fr.unmute).props.onPress(); assert.equal(mute, 1);
  tree = h.render('SocialVideo', { ...props, active: false }); h.flush(); assert.equal(pauses, 2);
  background('background'); h.render('SocialVideo', props); h.flush(); assert.equal(pauses, 3);
  status = 'error'; tree = h.render('SocialVideo', props); assert.equal(find(tree, 'Text').props.children[0], dictionaries.fr.videoUnavailable); assert.ok(find(tree, 'Pressable', dictionaries.fr.retry));
});

test('post actions are icon-only, expose true counts, localized labels and selected Like state', () => {
  for (const locale of ['fr', 'en', 'ar']) {
    const h = harness('../src/components/PostActions.tsx'); let likes = 0, comments = 0, shares = 0, reactions = 0;
    const props = { locale, liked: false, likes: 24, comments: 8, onLike: () => likes++, onComment: () => comments++, onShare: () => shares++, onReactions: () => reactions++ };
    let tree = h.render('PostActions', props); const actions = walk(tree).filter(node => node.type === 'Pressable');
    assert.equal(actions.length, 3); assert.deepEqual(walk(tree).filter(node => node.type === 'Text').map(node => node.props.children[0]), [24, 8]);
    actions.forEach(action => assert.ok(action.props.style.minHeight >= 48));
    find(tree, 'Pressable', dictionaries[locale].likePost).props.onPress(); actions[0].props.onLongPress(); find(tree, 'Pressable', dictionaries[locale].commentPost).props.onPress(); find(tree, 'Pressable', dictionaries[locale].share).props.onPress();
    assert.deepEqual([likes, comments, shares, reactions], [1, 1, 1, 1]);
    tree = h.render('PostActions', { ...props, liked: true }); assert.equal(find(tree, 'Icon').props.filled, true); assert.equal(find(tree, 'Pressable', dictionaries[locale].unlikePost).props.accessibilityState.selected, true);
  }
});

test('edge gesture reserves the physical left 28dp, rejects vertical/central swipes and closes keyboard first', () => {
  const gesture = { x0: 12, dx: 120, dy: 10, vx: 0.5 };
  assert.ok(capturesEdgeSwipe(gesture)); assert.ok(completesEdgeSwipe(gesture));
  for (const invalid of [{ ...gesture, x0: 100 }, { ...gesture, dx: -120 }, { ...gesture, dy: 100 }]) assert.equal(capturesEdgeSwipe(invalid), false);
  assert.equal(completesEdgeSwipe({ ...gesture, dx: 35 }), false);
  let handlers, keyboard = false, dismissed = 0, back = 0;
  const h = harness('../src/components/EdgeSwipeBack.tsx', { '../navigation/edgeSwipe': { capturesEdgeSwipe, completesEdgeSwipe }, 'react-native': { View: 'View', PanResponder: { create: value => { handlers = value; return { panHandlers: {} }; } }, Keyboard: { isVisible: () => keyboard, dismiss: () => dismissed++ } } });
  const props = { children: 'Screen', onBack: () => back++ };
  const tree = h.render('EdgeSwipeBack', props); assert.equal(walk(tree).filter(node => node.type === 'Pressable').length, 0);
  handlers.onPanResponderRelease(null, gesture); assert.equal(back, 1);
  keyboard = true; handlers.onPanResponderRelease(null, gesture); assert.equal(dismissed, 1); assert.equal(back, 1);
  h.render('EdgeSwipeBack', { ...props, enabled: false }); assert.equal(handlers.onMoveShouldSetPanResponderCapture(null, gesture), false); handlers.onPanResponderRelease(null, gesture); assert.equal(back, 1);
});

test('Feed action callbacks reuse post Like/comments and share safe text when public origin is local', async () => {
  const calls = [], shared = [], navigated = [];
  let post = { id: 9, content: 'Real local post', author: { id: 15, name: 'Owner' }, likes: 0, commentsCount: 8, liked: false, createdAt: '2026-10-08', visibility: 'public' };
  const api = async (path, locale, method, body) => { calls.push({ path, method, body }); if (path === '/legal/config') return { frontendUrl: 'http://127.0.0.1:5173' }; if (path.endsWith('/like')) { post = { ...post, liked: !post.liked, likes: post.liked ? 0 : 1 }; return { data: post }; } return { data: [post] }; };
  const ui = Object.fromEntries(['Avatar', 'Button', 'Card', 'Empty', 'Input', 'Label', 'Loading'].map(name => [name, name]));
  const h = harness('../src/features/social/useSocial.tsx', { '../../components/feed/FeedScreen': { FeedScreen: 'FeedScreen' }, '../../components/BackButton': { BackButton: 'BackButton' }, '../../components/EdgeSwipeBack': { EdgeSwipeBack: 'EdgeSwipeBack' }, '../../components/PostHeaderActions': { PostHeaderActions: 'PostHeaderActions' }, '../../components/PostActions': { PostActions: 'PostActions' }, './reelsModel': { publicPostLink }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'expo-image-picker': {}, 'expo-linear-gradient': { LinearGradient: 'Gradient' }, '../../api/client': { api }, '../../api/errors': { ApiError: class extends Error {}, errorKey: () => 'offline' }, '../../components/ui': { ...ui, mediaUrl: value => value }, '../../components/Media': { Media: 'Media' }, '../../i18n/messages': { dictionaries }, '../../theme/ThemeProvider': { useTheme: () => ({ colors: {} }) }, 'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView', Image: 'Image', Alert: {}, Linking: {}, Share: { share: async value => shared.push(value) } } });
  const args = ['fr', { id: 15 }, screen => navigated.push(screen), async () => {}, () => {}];
  const render = () => h.invoke('useSocial', ...args);
  let hook = render(); const card = () => find(hook.render('feed'), 'FeedScreen').props.renderPost(post, { active: false });
  let actions = find(card(), 'PostActions'); actions.props.onLike(); await new Promise(resolve => setTimeout(resolve, 0)); hook = render();
  assert.equal(calls[0].path, '/posts/9/like'); assert.equal(calls[0].method, 'POST'); assert.equal(calls[0].body.reaction, 'like'); assert.equal(find(card(), 'PostActions').props.liked, true);
  find(card(), 'PostActions').props.onLike(); await new Promise(resolve => setTimeout(resolve, 0)); hook = render(); assert.equal(find(card(), 'PostActions').props.liked, false);
  find(card(), 'PostActions').props.onComment(); hook = render(); assert.equal(navigated.at(-1), 'post'); assert.ok(find(hook.render('post'), 'Input')); const navigationCount = navigated.length; find(hook.render('post'), 'PostActions').props.onComment(); assert.equal(navigated.length, navigationCount, 'Comment on an open detail must not push a duplicate route');
  find(card(), 'PostActions').props.onShare(); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(shared[0].message, 'Real local post');
  find(card(), 'PostActions').props.onReactions(); hook = render(); assert.ok(find(hook.render('feed'), 'Modal'));
});

test('header actions use real Follow/Unfollow, preserve failed state and confirm Report/Delete explicitly', async () => {
  const calls = [], shared = [], alerts = [], navigated = [];
  let fail = false;
  const post = { id: 41, content: 'LOCAL QA ONLY', author: { id: 16, name: 'Other QA', isFollowing: false }, likes: 0, commentsCount: 0, createdAt: '2026-10-08' };
  const mine = { ...post, id: 42, author: { id: 15, name: 'Owner QA' } };
  const api = async (path, locale, method, body) => { calls.push({ path, method, body }); if (fail && method) throw new Error('Test failure'); if (path.startsWith('/posts?')) return { data: [post, mine] }; if (path === '/stories') return { data: [] }; if (path === '/legal/config') return {}; return { data: {} }; };
  const ui = Object.fromEntries(['Avatar', 'Button', 'Card', 'Empty', 'Input', 'Label', 'Loading'].map(name => [name, name]));
  const h = harness('../src/features/social/useSocial.tsx', { '../../components/feed/FeedScreen': { FeedScreen: 'FeedScreen' }, '../../components/BackButton': { BackButton: 'BackButton' }, '../../components/EdgeSwipeBack': { EdgeSwipeBack: 'EdgeSwipeBack' }, '../../components/PostHeaderActions': { PostHeaderActions: 'PostHeaderActions' }, '../../components/PostActions': { PostActions: 'PostActions' }, './reelsModel': { publicPostLink }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'expo-image-picker': {}, 'expo-linear-gradient': { LinearGradient: 'Gradient' }, '../../api/client': { api }, '../../api/errors': { ApiError: class extends Error {}, errorKey: () => 'offline' }, '../../components/ui': { ...ui, mediaUrl: value => value }, '../../components/Media': { Media: 'Media' }, '../../i18n/messages': { dictionaries }, '../../theme/ThemeProvider': { useTheme: () => ({ colors: {} }) }, 'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView', Image: 'Image', Alert: { alert: (...args) => alerts.push(args) }, Linking: {}, Share: { share: async value => shared.push(value) } } });
  const args = ['fr', { id: 15 }, screen => navigated.push(screen), async () => {}, () => {}];
  const render = () => h.invoke('useSocial', ...args);
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  let hook = render(); await hook.load('feed'); hook = render();
  const feed = () => find(hook.render('feed'), 'FeedScreen');
  const header = id => find(feed().props.renderPost(feed().props.posts.find(value => value.id === id)), 'PostHeaderActions');
  assert.equal(header(41).props.owner, false); assert.equal(header(42).props.owner, true);
  header(41).props.onFollow(); await tick(); hook = render(); assert.equal(header(41).props.following, true); assert.equal(calls.at(-1).path, '/users/16/follow'); assert.equal(calls.at(-1).method, 'POST');
  header(41).props.onFollow(); await tick(); hook = render(); assert.equal(header(41).props.following, false); assert.equal(calls.at(-1).method, 'DELETE');
  fail = true; header(41).props.onFollow(); await tick(); hook = render(); assert.equal(header(41).props.following, false); fail = false;
  const prior = calls.length; header(41).props.onReport(); hook = render(); let modal = find(hook.render('feed'), 'Modal'); assert.ok(modal); assert.equal(calls.length, prior);
  modal.props.onRequestClose(); hook = render(); assert.equal(find(hook.render('feed'), 'Modal'), undefined); assert.equal(calls.length, prior);
  header(41).props.onReport(); hook = render(); modal = find(hook.render('feed'), 'Modal');
  walk(modal).find(node => node.type === 'Button' && node.props.label.startsWith(dictionaries.fr.reason_scam)).props.onPress(); hook = render();
  fail = true; modal = find(hook.render('feed'), 'Modal'); walk(modal).find(node => node.type === 'Button' && node.props.label === dictionaries.fr.report).props.onPress(); await tick(); hook = render(); modal = find(hook.render('feed'), 'Modal'); assert.ok(modal); assert.ok(walk(modal).some(node => node.props?.accessibilityRole === 'alert'));
  fail = false; walk(modal).find(node => node.type === 'Button' && node.props.label === dictionaries.fr.report).props.onPress(); await tick(); hook = render(); assert.equal(find(hook.render('feed'), 'Modal'), undefined); assert.equal(calls.at(-1).path, '/reports'); assert.equal(calls.at(-1).body.reportable_id, 41); assert.equal(calls.at(-1).body.reason, 'scam'); assert.ok(walk(hook.render('feed')).some(node => node.type === 'Label' && node.props.children[0] === dictionaries.fr.reportSent));
  header(42).props.onEdit(); assert.equal(navigated.at(-1), 'create-post');
  const beforeDelete = calls.length; header(42).props.onDelete(); assert.equal(calls.length, beforeDelete); const buttons = alerts.at(-1)[2]; assert.equal(buttons[0].style, 'cancel'); assert.equal(buttons[0].onPress, undefined); assert.equal(feed().props.posts.length, 2);
  buttons[1].onPress(); await tick(); hook = render(); assert.equal(calls.at(-1).path, '/posts/42'); assert.equal(calls.at(-1).method, 'DELETE'); assert.equal(feed().props.posts.length, 1);
});
