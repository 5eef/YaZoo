import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { dictionaries } from '../src/i18n/messages.ts';
import { themes, radius, spacing } from '../src/theme/tokens.ts';
import { ApiError, failureKey } from '../src/api/errors.ts';
import { primaryDestinations, secondaryDestinations } from '../src/navigation/destinations.ts';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...Object.values(node.props || {}).flatMap(walk)];
const find = (tree, type, label) => walk(tree).find(n => n.type === type && (!label || n.props.accessibilityLabel === label || n.props.label === label));
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(path, extra = {}, initial = {}) {
  let cursor = 0; const slots = [];
  const React = {
    createElement: (type, props, ...children) => ({type, props:{...props, children}}),
    createContext: () => ({Provider:'Provider'}), useContext: () => null,
    useState(value) { const i=cursor++; if(!(i in slots))slots[i]=i in initial?initial[i]:typeof value==='function'?value():value; return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}]; },
    useRef(value) { const i=cursor++; return slots[i] ||= {current:value}; },
    useMemo: f=>f(), useCallback:f=>f, useEffect(){cursor++;}, useEffectEvent:f=>f,
  };
  const native=Object.fromEntries(['View','Text','Pressable','Modal','ScrollView','Image','TextInput','ActivityIndicator','KeyboardAvoidingView','RefreshControl'].map(n=>[n,n]));
  const mocks={react:React,'react-native':{...native, Keyboard:{dismiss(){}},Platform:{OS:'android'},StyleSheet:{create:v=>v},useWindowDimensions:()=>({width:400})},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'expo-linear-gradient':{LinearGradient:'Gradient'},
    '../theme/ThemeProvider':{useTheme:()=>({colors:themes.light})},'../theme/tokens':{radius,spacing},'../i18n/messages':{dictionaries},
    './ui':{Avatar:'Avatar',mediaUrl:v=>v},'./ProfileActionsMenu':{ProfileActionsMenu:'ProfileActionsMenu'},...extra};
  const module={exports:{}};
  const source=read(path)+(path==='../App.tsx'?'\nexport { PilotApp };':'');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,
    {module,exports:module.exports,require:name=>{assert.ok(name in mocks,'Missing mock '+name);return mocks[name];},URL,URLSearchParams,FormData:class{entries=[];append(...args){this.entries.push(args);}},__DEV__:false});
  return {render(name,...args){cursor=0;return module.exports[name](...args);}};
}

test('profile exposes one accessible trigger, five translated actions and correct callbacks in all locales and themes', () => {
  for(const locale of ['fr','en','ar'])for(const mode of ['light','dark']) {
    const called=[];
    const h=harness('../src/components/ProfileActionsMenu.tsx',{'../theme/ThemeProvider':{useTheme:()=>({colors:themes[mode]})}});
    const props={locale,disabled:false,...Object.fromEntries(['Avatar','Cover','Edit','Settings','Web'].map(name=>['on'+name,()=>called.push(name)]))};
    let tree=h.render('ProfileActionsMenu',props);
    assert.equal(walk(tree).filter(n=>n.type==='Pressable').length,1);
    let trigger=find(tree,'Pressable',dictionaries[locale].profileActions);
    assert.equal(trigger.props.accessibilityRole,'button');assert.equal(trigger.props.style.width,48);assert.equal(trigger.props.style.height,48);
    for(const label of ['editAvatar','editCover','editProfile','settings','viewWeb']) {
      trigger.props.onPress(); tree=h.render('ProfileActionsMenu',props);
      assert.ok(find(tree,'Modal')); assert.equal(find(tree,'Pressable',dictionaries[locale].profileActions).props.accessibilityState.expanded,true);
      const action=find(tree,'Pressable',dictionaries[locale][label]);assert.ok(action);
      const text=find(action,'Text');assert.equal(text.props.style.writingDirection,locale==='ar'?'rtl':'ltr');assert.equal(text.props.style.color,themes[mode].text);
      action.props.onPress();tree=h.render('ProfileActionsMenu',props);assert.equal(find(tree,'Modal'),undefined);
      trigger=find(tree,'Pressable',dictionaries[locale].profileActions);
    }
    assert.deepEqual(called,['Avatar','Cover','Edit','Settings','Web']);
    trigger.props.onPress();tree=h.render('ProfileActionsMenu',props);find(tree,'Modal').props.onRequestClose();tree=h.render('ProfileActionsMenu',props);assert.equal(find(tree,'Modal'),undefined);
    tree=h.render('ProfileActionsMenu',{...props,disabled:true});assert.equal(find(tree,'Pressable').props.disabled,true);
  }
});

test('profile keeps business text verbatim and logical stats order in RTL without five large owner buttons', () => {
  const profile={id:2,name:'Youssef BOUGHIOUL',city:'Sefrou',bio:'Présentation française',postsCount:7,followersCount:8,followingCount:9,isOwner:true};
  for(const locale of ['fr','en','ar']) {
    const h=harness('../src/components/ProfileHeader.tsx');const tree=h.render('ProfileHeader',{profile,locale,busy:false});
    assert.equal(tree.props.style.direction,locale==='ar'?'rtl':'ltr');
    for(const value of [profile.name,profile.city,profile.bio])assert.ok(walk(tree).some(n=>n.type==='Text'&&n.props.children.includes(value)));
    assert.equal(walk(tree).filter(n=>n.type==='ProfileActionsMenu').length,1);
    assert.equal(walk(tree).filter(n=>n.type==='Button'||n.type==='Pressable').length,0);
    const stats=walk(tree).find(n=>n.props?.testID==='profile-stats');
    assert.deepEqual(walk(stats).filter(n=>n.type==='Text').map(n=>n.props.children.join('')),[`7 ${dictionaries[locale].posts}`,`8 ${dictionaries[locale].followers}`,`9 ${dictionaries[locale].following}`]);
    assert.equal(find(h.render('ProfileHeader',{profile:{...profile,isOwner:false},locale,busy:false}),'ProfileActionsMenu'),undefined);
  }
});

test('drawer omits appearance but preserves destinations, closing, RTL and internal logo', () => {
  for(const rtl of [false,true]) {
    const nav=[];
    const h=harness('../src/navigation/YaZooShell.tsx',{'../components/EdgeSwipeBack':{EdgeSwipeBack:'EdgeSwipeBack'},'../components/Icon':{Icon:'Icon'},'../components/ui':{Avatar:'Avatar',Button:'Button',Label:'Label'},'./destinations':{primaryDestinations,secondaryDestinations},'../../assets/brand/yazoo-inapp-logo.png':'inapp'});
    const props={rtl,screen:'user-profile',user:{name:'Owner'},label:k=>k,navigate:s=>nav.push(s),webLinks:[],communitiesEnabled:true};
    let tree=h.render('YaZooShell',props);
    for(const label of ['theme','system','light','dark'])assert.equal(find(tree,'Button',label),undefined);
    for(const target of secondaryDestinations)assert.ok(find(tree,'Pressable',target));
    assert.equal(find(tree,'Image').props.source,'inapp');assert.equal(find(tree,'Image').props.resizeMode,'contain');
    find(tree,'Pressable','menu').props.onPress();tree=h.render('YaZooShell',props);assert.equal(find(tree,'Modal').props.visible,true);
    assert.equal(find(tree,'Modal').props.children[0].props.style.flexDirection,rtl?'row-reverse':'row');
    find(tree,'Pressable','settings').props.onPress();tree=h.render('YaZooShell',props);assert.equal(find(tree,'Modal').props.visible,false);assert.deepEqual(nav,['settings']);
  }
});

test('Settings still changes system/light/dark through existing ThemeProvider handler', async () => {
  for(const locale of ['fr','en','ar']) {
    const changes=[];
    const h=harness('../App.tsx',{
      './src/components/reels/ReelsScreen':{ReelsScreen:'Reels'},'expo-router':{Stack:'Stack',router:{},usePathname:()=>'/settings'},
      'expo-secure-store':{},'expo-localization':{getLocales:()=>[{languageCode:locale}]},'./src/i18n/deviceLocale':{},
      './src/components/auth/BrandLoading':{BrandLoading:'BrandLoading'},'./src/components/auth/MobileAuthEntry':{MobileAuthEntry:'MobileAuthEntry'},
      './src/theme/ThemeProvider':{useTheme:()=>({colors:themes.light,preference:'system',setPreference:async v=>changes.push(v)})},
      './src/navigation/YaZooShell':{YaZooShell:'YaZooShell'},'./src/navigation/destinations':{screens:['settings'],socialScreens:[]},
      './src/features/social/useSocial':{useSocial:()=>({reset(){},flags:{},isOwnProfile:true})},'./src/components/ui':{Avatar:'Avatar',Button:'Button'},
      './src/components/ProfessionalCard':{},'./src/api/client':{},'./src/api/errors':{ApiError,failureKey},'./src/auth/session':{},'./src/i18n/messages':{dictionaries},
    },{0:locale,1:{user:{id:2,name:'Owner'}},2:false});
    for(const value of ['system','light','dark']) {
      const tree=h.render('PilotApp');const label=dictionaries[locale][value]+(value==='system'?' ✓':'');
      const button=find(tree,'Button',label);assert.ok(button);button.props.onPress();await tick();
    }
    assert.deepEqual(changes,['system','light','dark']);
  }
});

test('in-app logo is the unchanged official source and login/native branding references stay separate', () => {
  const hash=path=>createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
  assert.equal(hash('../assets/brand/yazoo-inapp-logo.png'),hash('../../docs/logo/YaZoo.png'));
  const shell=read('../src/navigation/YaZooShell.tsx');assert.ok(shell.includes('yazoo-inapp-logo.png'));assert.ok(!shell.includes('yazoo-symbol.png'));
  const login=read('../src/components/auth/AnimatedBrandLogo.tsx');assert.ok(!login.includes('yazoo-inapp-logo'));assert.ok(!login.includes('YaZoo.png'));
  for(const [file,expected] of Object.entries({'light.mp4':'9c737ff03b668ae099eb0bb620b3ef6bae4a90e6af7cb6fb6f2cb3d9c1ad9e72','dark.mp4':'71a1aaf8159ec24f0874f946c5d3c053e10e22ee3f71814f4679b664bf3a5230','light.png':'552c618d370fe6e800652bbdd61906886585abf719879e3b2da7fa1db8ec701f','dark.png':'a14580ce3d0737414395ba90b92337fe5e72c1a2f0e36cb4141422e7ab405462'}))assert.equal(hash('../assets/brand/login-logo-'+file),expected);
  const config=JSON.parse(read('../app.json')).expo;assert.equal(config.icon,'./assets/brand/app-icon.png');assert.equal(config.android.adaptiveIcon.foregroundImage,'./assets/brand/adaptive-foreground.png');assert.equal(config.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-splash-screen')[1].image,'./assets/brand/yazoo-symbol.png');
});

test('profile menu wiring reuses uploads, edit PATCH, Settings navigation and existing web handler', async () => {
  const profile={id:2,name:'Owner',bio:'Original bio',city:'Fès',isOwner:true,postsCount:0,followersCount:0,followingCount:0};
  const requests=[],navigations=[],links=[];
  const api=async (path,locale,method='GET',body)=>{requests.push({path,method,body});return path==='/legal/config'?{frontendUrl:'https://yazoo-showcase.pages.dev'}:path.startsWith('/users/')?{data:profile}:{data:[]};};
  const ui=Object.fromEntries(['Avatar','Button','Card','Empty','Input','Label','Loading'].map(n=>[n,n]));
  const h=harness('../src/features/social/useSocial.tsx',{
    '../../components/feed/FeedScreen':{FeedScreen:'FeedScreen'},'../../components/EdgeSwipeBack':{EdgeSwipeBack:'EdgeSwipeBack'},
    '../../components/PostHeaderActions':{PostHeaderActions:'PostHeaderActions'},'../../components/PostActions':{PostActions:'PostActions'},
    './reelsModel':{},'../../components/BackButton':{BackButton:'BackButton'},'../../components/ProfileHeader':{ProfileHeader:'ProfileHeader'},
    'expo-image-picker':{launchImageLibraryAsync:async()=>({canceled:false,assets:[{uri:'file:///qa.png',fileName:'qa.png',mimeType:'image/png'}]})},
    '../../api/client':{api},'../../api/errors':{ApiError,failureKey},'../../components/ui':{...ui,mediaUrl:v=>v},'../../components/Media':{Media:'Media'},
    '../../i18n/messages':{dictionaries},'../../theme/ThemeProvider':{useTheme:()=>({colors:themes.light})},
    'react-native':{View:'View',Text:'Text',Image:'Image',Modal:'Modal',Pressable:'Pressable',ScrollView:'ScrollView',Linking:{openURL:async url=>links.push(url)}},
  });
  const args=['fr',{id:2},s=>navigations.push(s),async()=>{},()=>{}];
  let social=h.render('useSocial',...args);await social.load('user-profile');
  for(const [handler,field] of [['onAvatar','avatar_file'],['onCover','cover_photo_file']]) {
    social=h.render('useSocial',...args);find(social.render('user-profile'),'ProfileHeader').props[handler]();await tick();
    const upload=requests.at(-1);assert.equal(upload.path,'/users/2');assert.equal(upload.method,'POST');
    assert.ok(upload.body.entries.some(([k,v])=>k==='_method'&&v==='PATCH'));assert.ok(upload.body.entries.some(([k,v])=>k===field&&v.uri==='file:///qa.png'));
  }
  social=h.render('useSocial',...args);let header=find(social.render('user-profile'),'ProfileHeader');header.props.onEdit();
  social=h.render('useSocial',...args);const editing=social.render('user-profile');
  assert.equal(find(editing,'Input',dictionaries.fr.bio).props.value,profile.bio);
  find(editing,'Button',dictionaries.fr.save).props.onPress();await tick();assert.equal(requests.at(-1).method,'PATCH');assert.deepEqual(JSON.parse(JSON.stringify(requests.at(-1).body)),{name:profile.name,bio:profile.bio,city:profile.city});
  social=h.render('useSocial',...args);header=find(social.render('user-profile'),'ProfileHeader');header.props.onSettings();assert.deepEqual(navigations,['settings']);
  header.props.onWeb();await tick();assert.deepEqual(links,['https://yazoo-showcase.pages.dev/profile/2']);
});
