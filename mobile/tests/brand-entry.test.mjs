import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { deviceLocale, startupLocale } from '../src/i18n/deviceLocale.ts';
import { dictionaries } from '../src/i18n/messages.ts';
import { themes, radius, spacing, typography } from '../src/theme/tokens.ts';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const walk = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(walk) : [tree, ...Object.values(tree.props || {}).flatMap(walk)];
function harness(path, mocks, overrides = {}) {
  let cursor = 0; const slots = [], effects = [], timers = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    createContext: () => ({ Provider: 'Provider' }), useContext: () => null,
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = index in overrides ? overrides[index] : typeof initial === 'function' ? initial() : initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffectEvent: fn => fn,
    useEffect(fn, deps) { const index = cursor++; if (!slots[index] || deps.some((item, i) => item !== slots[index][i])) { slots[index] = deps; effects.push(fn); } },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source + (path === '../App.tsx' ? '\nexports.TestPilotApp = PilotApp;' : ''), {
    module, exports: module.exports, require: name => { if (name === 'react') return React; assert.ok(name in mocks, `Missing mock ${name}`); return mocks[name]; },
    setTimeout: fn => { timers.push(fn); return fn; }, clearTimeout: fn => { const index = timers.indexOf(fn); if (index >= 0) timers.splice(index, 1); },
  });
  return { render(name, props) { cursor = 0; return module.exports[name](props); }, flush() { effects.splice(0).forEach(fn => fn()); }, advance() { timers.splice(0).forEach(fn => fn()); }, timers };
}

test('device language maps regional locales with French fallback; saved authenticated preferences survive', () => {
  for (const [input, expected] of [['ar-MA', 'ar'], ['en-US', 'en'], ['fr-FR', 'fr'], ['es-ES', 'fr'], [undefined, 'fr']]) assert.equal(deviceLocale(input), expected);
  assert.equal(startupLocale('ar', 'en', false), 'ar');
  assert.equal(startupLocale('ar', 'en', true), 'en');
});

function entry(reduceMotion = false) {
  class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate(options) { return options; } stopAnimation() {} }
  const native = Object.fromEntries(['View', 'Text', 'Image', 'TextInput', 'ScrollView', 'KeyboardAvoidingView', 'ActivityIndicator'].map(name => [name, name]));
  Object.assign(native, { Platform: { OS: 'android' }, StyleSheet: { create: value => value }, Easing: { cubic: 'cubic', out: value => value }, Animated: { Value, View: 'AnimatedView', timing: (value, options) => ({ start: () => value.setValue(options.toValue) }), parallel: animations => ({ start: () => animations.forEach(animation => animation.start()) }) }, AccessibilityInfo: { isReduceMotionEnabled: async () => reduceMotion, addEventListener: () => ({ remove() {} }) } });
  return harness('../src/components/auth/MobileAuthEntry.tsx', { 'react-native': native, './AnimatedBrandLogo': { AnimatedBrandLogo: 'AnimatedBrandLogo' }, '../ui': { Button: 'Button' }, '../../theme/ThemeProvider': { useTheme: () => ({ colors: themes.light, isDark: false }) }, '../../theme/tokens': { themes, radius, spacing, typography }, '../../i18n/messages': { dictionaries } });
}
const props = { locale: 'fr', register: false, busy: false, error: '', values: { name: '', email: '', password: '', password_confirmation: '' }, fields: {}, onChange() {}, onSubmit() {}, onToggle() {}, onRetry() {}, onLegal() {} };
test('intro shows only brand, then Login and Register, without guest language controls in FR EN AR', () => {
  for (const locale of ['fr', 'en', 'ar']) {
    const h = entry(); let tree = h.render('MobileAuthEntry', { ...props, locale }); h.flush();
    assert.equal(walk(tree).filter(node => node.type === 'TextInput' || node.type === 'Button').length, 0);
    h.advance(); tree = h.render('MobileAuthEntry', { ...props, locale }); h.flush();
    const buttons = walk(tree).filter(node => node.type === 'Button');
    assert.ok(buttons.some(node => node.props.label === dictionaries[locale].login));
    assert.ok(buttons.some(node => node.props.label === dictionaries[locale].register));
    assert.ok(!buttons.some(node => ['FR', 'EN', 'AR', 'Français', 'English', 'العربية'].includes(node.props.label)));
    const inputs = walk(tree).filter(node => node.type === 'TextInput'); assert.equal(inputs.length, 2);
    assert.equal(inputs[0].props.style[1].writingDirection, locale === 'ar' ? 'rtl' : 'ltr');
    tree = h.render('MobileAuthEntry', { ...props, locale, register: true }); h.flush();
    assert.equal(walk(tree).filter(node => node.type === 'TextInput').length, 4);
    assert.ok(walk(tree).some(node => node.props?.children?.includes(dictionaries[locale].consent)));
    assert.equal(h.timers.length, 0, 'register/re-render does not restart intro');
  }
});
test('Reduce Motion exposes final form without waiting for intro timer', async () => {
  const h = entry(true); h.render('MobileAuthEntry', props); h.flush(); await Promise.resolve();
  const tree = h.render('MobileAuthEntry', props);
  assert.ok(walk(tree).some(node => node.props?.testID === 'auth-form'));
  assert.equal(h.timers.length, 0);
});

test('restoring session renders brand only, a saved session renders shell, a guest renders entry', () => {
  const saved = { token: 'test-only', user: { id: 1, name: 'DEMO' } };
  const mocks = {
    './src/components/reels/ReelsScreen': { ReelsScreen: 'Reels' }, 'expo-router': { Stack: 'Stack', router: {}, usePathname: () => '/feed' },
    'react-native': { StyleSheet: { create: value => value } }, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, 'expo-secure-store': {}, 'expo-localization': { getLocales: () => [{ languageCode: 'ar' }] },
    './src/i18n/deviceLocale': { deviceLocale, startupLocale }, './src/components/auth/BrandLoading': { BrandLoading: 'BrandLoading' }, './src/components/auth/MobileAuthEntry': { MobileAuthEntry: 'MobileAuthEntry' },
    './src/theme/ThemeProvider': { useTheme: () => ({ colors: themes.light }) }, './src/navigation/YaZooShell': { YaZooShell: 'YaZooShell' }, './src/navigation/destinations': { screens: ['feed'], socialScreens: ['feed'] },
    './src/features/social/useSocial': { useSocial: () => ({ render: () => 'feed', reset() {}, flags: {} }) }, './src/components/ui': {}, './src/components/ProfessionalCard': {}, './src/api/client': {}, './src/api/errors': {}, './src/auth/session': {}, './src/i18n/messages': { dictionaries },
  };
  for (const [session, restoring, expected] of [[saved, true, 'BrandLoading'], [null, true, 'BrandLoading'], [saved, false, 'YaZooShell'], [null, false, 'MobileAuthEntry']]) {
    const h = harness('../App.tsx', mocks, { 1: session, 2: restoring }); const tree = h.render('TestPilotApp');
    assert.ok(walk(tree).some(node => node.type === expected));
    if (restoring || session) assert.ok(!walk(tree).some(node => node.type === 'MobileAuthEntry'));
  }
});

test('mobile launcher, adaptive foreground, splash and favicon are new square PNG assets', () => {
  const config = JSON.parse(read('../app.json')).expo;
  const paths = [config.icon, config.android.adaptiveIcon.foregroundImage, config.web.favicon, config.plugins.find(item => Array.isArray(item) && item[0] === 'expo-splash-screen')[1].image];
  for (const path of paths) {
    assert.ok(path.startsWith('./assets/brand/')); assert.ok(existsSync(new URL('../' + path, import.meta.url)));
    const png = readFileSync(new URL('../' + path, import.meta.url)); assert.equal(png.toString('ascii', 1, 4), 'PNG'); assert.equal(png.readUInt32BE(16), png.readUInt32BE(20));
  }
  for (const path of ['../App.tsx', '../src/navigation/YaZooShell.tsx', '../src/components/auth/MobileAuthEntry.tsx']) assert.ok(!read(path).includes('yazoo-logo.webp'));
  const source = fileURLToPath(new URL('../src/', import.meta.url));
  for (const name of readdirSync(source, { recursive: true }).filter(name => name.endsWith('.tsx'))) {
    const file = resolve(source, name); const text = readFileSync(file, 'utf8');
    assert.ok(!text.includes('yazoo-logo.webp'));
    for (const [, asset] of text.matchAll(/require\(['"]([^'"]*assets\/[^'"]+)['"]\)/g)) assert.ok(existsSync(resolve(dirname(file), asset)), `Missing runtime asset: ${asset}`);
  }
});
