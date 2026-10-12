import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { resolveTheme } from '../src/theme/tokens.ts';

function harness() {
  let cursor = 0, source, calls = 0;
  const slots = [], pending = [], cleanups = [], events = {}, timers = [];
  const player = { status: 'readyToPlay', plays: 0, pauses: 0, play() { this.plays++; }, pause() { this.pauses++; }, addListener(name, fn) { events[name] = fn; return { remove() { delete events[name]; } }; } };
  const React = {
    Component: class {}, createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = value; }]; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((d, n) => d !== slots[i][n])) { slots[i] = deps; pending.push([i, fn]); } },
  };
  const native = { View: 'View', Image: 'Image', StyleSheet: { absoluteFill: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 } }, AppState: { currentState: 'active', addEventListener(name, fn) { events[name] = fn; return { remove() { delete events[name]; } }; } } };
  const module = { exports: {} };
  const text = readFileSync(new URL('../src/components/auth/AnimatedBrandLogo.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code + '\nexports.BrandVideo = BrandVideo; exports.Boundary = VideoFallbackBoundary;', {
    module, exports: module.exports,
    require(name) { if (name === 'react') return React; if (name === 'react-native') return native; if (name === 'expo-video') return { VideoView: 'VideoView', useVideoPlayer(value, setup) { calls++; if (!source) { source = value; setup(player); } else assert.equal(source, value, 'simple rerenders keep source'); return player; } }; return name; },
    setTimeout(fn) { timers.push(fn); return fn; }, clearTimeout(fn) { const i = timers.indexOf(fn); if (i >= 0) timers.splice(i, 1); },
  });
  return { player, events, timers, exports: module.exports, calls: () => calls,
    render(name, props) { cursor = 0; return module.exports[name](props); },
    flush() { for (const [i, fn] of pending.splice(0)) { cleanups[i]?.(); cleanups[i] = fn(); } },
    unmount() { cleanups.forEach(fn => fn?.()); },
  };
}
const walk = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(walk) : [tree, ...Object.values(tree.props || {}).flatMap(walk)];

test('resolved light/dark/system selects matching local video and static fallback; theme switch resets only video subtree', () => {
  const h = harness();
  for (const [preference, system] of [['light', 'dark'], ['dark', 'light'], ['system', 'light'], ['system', 'dark'], ['system', 'light']]) {
    const mode = resolveTheme(preference, system);
    const tree = h.render('AnimatedBrandLogo', { isDark: mode === 'dark', reduceMotion: false, visible: true, accessible: true });
    const nodes = walk(tree), image = nodes.find(n => n.type === 'Image'), video = nodes.find(n => n.props?.source?.endsWith('.mp4'));
    assert.ok(image.props.source.endsWith(`login-logo-${mode}.png`));
    assert.ok(video.props.source.endsWith(`login-logo-${mode}.mp4`));
    assert.equal(nodes.filter(n => n.props?.source?.endsWith('.mp4')).length, 1);
    assert.ok(nodes.some(n => n.props?.key === mode));
    assert.equal(image.props.resizeMode, 'contain');
  }
});

test('Reduced Motion mounts matching fallback with no video; initialization boundary preserves fallback', () => {
  const h = harness();
  for (const isDark of [false, true]) {
    const tree = h.render('AnimatedBrandLogo', { isDark, reduceMotion: true, visible: true, accessible: false });
    assert.equal(walk(tree).filter(n => n.props?.source?.endsWith('.mp4')).length, 0);
    assert.equal(walk(tree).filter(n => n.type === 'Image').length, 1);
    assert.equal(h.calls(), 0);
  }
  const boundary = new h.exports.Boundary();
  boundary.state = h.exports.Boundary.getDerivedStateFromError();
  assert.equal(boundary.render(), null);
});

test('video autoplays muted/looped without controls, pauses offscreen/background, retains source and removes listeners', () => {
  const h = harness();
  let tree = h.render('BrandVideo', { source: 1, visible: true }); h.flush();
  assert.equal(h.player.loop, true); assert.equal(h.player.muted, true); assert.equal(h.player.staysActiveInBackground, false); assert.equal(h.player.plays, 1);
  assert.equal(tree.props.nativeControls, false); assert.equal(tree.props.fullscreenOptions.enable, false); assert.equal(tree.props.contentFit, 'contain'); assert.equal(tree.props.focusable, false);
  assert.equal(tree.props.style[1].opacity, 0);
  tree.props.onFirstFrameRender(); tree = h.render('BrandVideo', { source: 1, visible: true }); h.flush(); assert.equal(tree.props.style[1].opacity, 1);
  h.events.change('background'); assert.ok(h.player.pauses > 0);
  h.events.change('active'); assert.equal(h.player.plays, 2);
  h.render('BrandVideo', { source: 1, visible: false }); h.flush(); const plays = h.player.plays; h.events.change('active'); assert.equal(h.player.plays, plays);
  h.unmount(); assert.deepEqual(Object.keys(h.events), []);
});

test('decoder error and first-frame timeout remove video while wrapper keeps static logo', () => {
  for (const failure of ['error', 'timeout']) {
    const h = harness(); h.render('BrandVideo', { source: 1, visible: true }); h.flush();
    if (failure === 'error') h.events.statusChange({ status: 'error' }); else h.timers[0]();
    assert.equal(h.render('BrandVideo', { source: 1, visible: true }), null); h.flush(); assert.ok(h.player.pauses > 0);
    h.unmount();
  }
});
