import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { dictionaries } from '../src/i18n/messages.ts';
import { themes } from '../src/theme/tokens.ts';
import { isSession } from '../src/auth/validation.ts';
import { endSession } from '../src/auth/logout.ts';

const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
function mount(path, mocks) {
  const state = []; let cursor = 0;
  const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; } };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, { module, exports: module.exports, require: name => name === 'react' ? react : mocks[name] });
  return (name, props) => { cursor = 0; return module.exports[name](props); };
}

test('password toggles preserve value, independent confirmation, localized labels, RTL and themes', () => {
  assert.equal(dictionaries.fr.showPassword, 'Afficher le mot de passe');
  assert.equal(dictionaries.en.hidePassword, 'Hide password');
  assert.equal(dictionaries.ar.showPassword, 'إظهار كلمة المرور');
  assert.equal(dictionaries.ar.hidePassword, 'إخفاء كلمة المرور');
  for (const locale of ['fr', 'en', 'ar']) for (const colors of [themes.light, themes.dark]) {
    const mocks = { 'react-native': { Pressable: 'Pressable', TextInput: 'TextInput', View: 'View' }, '../Icon': { Icon: 'Icon' }, '../../theme/ThemeProvider': { useTheme: () => ({ colors }) }, '../../i18n/messages': { dictionaries } };
    const password = mount('../src/components/auth/PasswordInput.tsx', mocks);
    const confirmation = mount('../src/components/auth/PasswordInput.tsx', mocks);
    const props = { locale, value: 'fictional-only', onChangeText: () => assert.fail('toggle must not change value') };
    const render = () => walk(password('PasswordInput', props));
    let tree = render();
    for (const visible of [false, true, false]) {
      tree = render();
      const input = tree.find(n => n.type === 'TextInput'); const button = tree.find(n => n.type === 'Pressable');
      assert.equal(input.props.value, props.value); assert.equal(input.props.secureTextEntry, !visible);
      assert.equal(button.props.accessibilityLabel, dictionaries[locale][visible ? 'hidePassword' : 'showPassword']);
      assert.equal(button.props.accessibilityRole, 'button'); assert.equal(button.props.accessibilityState.checked, visible);
      assert.ok(button.props.style.minHeight >= 44); assert.ok(button.props.style.width >= 44);
      assert.equal(button.props.style[locale === 'ar' ? 'left' : 'right'], 2);
      assert.equal(tree.find(n => n.type === 'Icon').props.color, colors.brandText);
      assert.equal(walk(confirmation('PasswordInput', props)).find(n => n.type === 'TextInput').props.secureTextEntry, true);
      button.props.onPress();
    }
  }
});

test('logout clears local session immediately, including failed or synchronous remote revocation', async () => {
  for (const fails of [false, true, 'sync']) {
    let bearer = 'fictional-token'; let stored = bearer; let privateData = ['private']; let route = '/feed'; let finish;
    const result = endSession(() => { assert.equal(bearer, 'fictional-token'); if (fails === 'sync') throw Error('offline'); return new Promise((resolve, reject) => { finish = () => fails ? reject(Error('offline')) : resolve({}); }); }, async () => { stored = null; }, () => { bearer = null; privateData = []; route = '/'; });
    assert.equal(bearer, null); assert.equal(stored, null); assert.deepEqual(privateData, []); assert.equal(route, '/');
    finish?.(); assert.deepEqual(await result, { remoteRevoked: !fails, localCleared: true });
  }
});

test('session validation refuses empty tokens, malformed user and expired responses', () => {
  const valid = { token: 'fictional-only', user: { id: 4, name: 'Test', email: 'test@example.invalid' }, expires_at: new Date(Date.now() + 60000).toISOString() };
  assert.equal(isSession(valid), true);
  for (const value of [null, {}, [], { ...valid, token: '' }, { ...valid, user: { id: 1 } }, { ...valid, expires_at: 'invalid' }, { ...valid, expires_at: '2000-01-01' }]) assert.equal(isSession(value), false);
});

test('SecureStore saves, restores and deletes sessions; corrupt or expired storage is removed', async () => {
  let stored = null; let deletes = 0;
  const session = mount('../src/auth/session.ts', {
    'expo-secure-store': {
      getItemAsync: async key => { assert.equal(key, 'yazoo-native-session'); return stored; },
      setItemAsync: async (key, value) => { assert.equal(key, 'yazoo-native-session'); stored = value; },
      deleteItemAsync: async key => { assert.equal(key, 'yazoo-native-session'); stored = null; deletes++; },
    }, './validation': { isSession },
  });
  const valid = { token: 'fictional-only', user: { id: 4, name: 'Test', email: 'test@example.invalid' }, expires_at: new Date(Date.now() + 60000).toISOString() };
  await session('saveSession', valid);
  assert.deepEqual(JSON.parse(JSON.stringify(await session('readSession'))), valid);
  await session('clearSession'); assert.equal(stored, null);
  for (const value of ['broken JSON', JSON.stringify({ ...valid, expires_at: '2000-01-01' })]) {
    stored = value; assert.equal(await session('readSession'), null); assert.equal(stored, null);
  }
  assert.equal(deletes, 3);
});

test('drawer and wide sidebar close before calling logout; disabled state blocks repeat presses natively', () => {
  for (const width of [360, 1200]) for (const rtl of [false, true]) {
    let calls = 0;
    const render = mount('../src/navigation/YaZooShell.tsx', { '../components/EdgeSwipeBack': { EdgeSwipeBack: 'Edge' }, 'react-native': { ...Object.fromEntries(['Image','Modal','Pressable','ScrollView','Text','View'].map(n => [n,n])), Keyboard: { dismiss() {} }, useWindowDimensions: () => ({ width }) }, 'react-native-safe-area-context': { SafeAreaView: 'SafeArea' }, 'expo-linear-gradient': { LinearGradient: 'Gradient' }, '../components/Icon': { Icon: 'Icon' }, '../components/ui': { Avatar: 'Avatar', Button: 'Button', Label: 'Label' }, '../theme/ThemeProvider': { useTheme: () => ({ colors: themes.light }) }, '../theme/tokens': { radius: {} }, './destinations': { primaryDestinations: ['feed'], secondaryDestinations: ['settings'] } });
    const props = { user: { name: 'Test' }, label: key => key, webLinks: [], screen: 'feed', rtl, onLogout: () => calls++, logoutBusy: false };
    let tree = walk(render('YaZooShell', props)); tree.find(n => n.props?.accessibilityLabel === 'menu').props.onPress();
    tree = walk(render('YaZooShell', props)); assert.equal(tree.find(n => n.type === 'Modal').props.visible, true);
    tree.find(n => n.props?.accessibilityLabel === 'logout').props.onPress();
    assert.equal(calls, 1); tree = walk(render('YaZooShell', props)); assert.equal(tree.find(n => n.type === 'Modal').props.visible, false);
    tree = walk(render('YaZooShell', { ...props, logoutBusy: true })); assert.equal(tree.find(n => n.props?.accessibilityLabel === 'logout').props.disabled, true);
  }
});
