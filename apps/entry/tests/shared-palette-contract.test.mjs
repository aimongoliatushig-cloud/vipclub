import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8').toLowerCase()

const entryBase=read('../src/styles.css')
const entryDetail=read('../src/detail.css')
const entryTheme=read('../src/theme.css')
const entryMain=read('../src/main.tsx')
const entryThemeRuntime=read('../src/themeruntime.ts')
const entryHeader=read('../src/appheader.tsx')
const managerCss=read('../../manager-app/src/styles.css')
const managerTheme=read('../../manager-app/src/theme.css')
const managerMain=read('../../manager-app/src/main.tsx')
const managerThemeRuntime=read('../../manager-app/src/themeruntime.ts')
const managerLive=read('../../manager-app/src/app/livemanagementapplication.tsx')
const staffIndex=read('../../entertainer-app/src/index.css')
const staffWorkbench=read('../../entertainer-app/src/workbench.css')
const staffTheme=read('../../entertainer-app/src/theme.css')
const staffThemeRuntime=read('../../entertainer-app/src/themeruntime.ts')
const staffApp=read('../../entertainer-app/src/app.tsx')
const staffHtml=read('../../entertainer-app/index.html')
const staffManifest=read('../../entertainer-app/public/manifest.webmanifest')
const entryHtml=read('../index.html')
const entryManifest=read('../public/manifest.webmanifest')
const entryServiceWorker=read('../public/sw.js')

const lightTheme=['#f9fafb','#ffffff','#111827','#4f46e5','#4338ca','#eef2ff','#c7d2fe','#818cf8']
const darkTheme=['#111827','#1f2937','#f9fafb','#6366f1','#818cf8','#a5b4fc']

test('all employee apps expose the approved light and indigo tokens in both themes',()=>{
  for(const theme of [entryTheme,managerTheme,staffTheme]){
    for(const token of lightTheme) assert.ok(theme.includes(token),`Theme is missing light token ${token}`)
    for(const token of darkTheme) assert.ok(theme.includes(token),`Theme is missing dark token ${token}`)
    assert.match(theme,/html\[data-theme='dark'\]/)
  }
})

test('VIP Entry theme loads after legacy role overlays and drawers',()=>{
  assert.match(entryDetail,/shared employee surfaces/)
  assert.ok(entryMain.indexOf("import './theme.css'")>entryMain.indexOf("import './detail.css'"))
  assert.match(entryTheme,/\.entry-insight,[\s\S]*\.detail-drawer/)
  assert.match(entryTheme,/\.operation-branch-tabs button\.active/)
  assert.doesNotMatch(read('../src/app.tsx'),/entry-day-switch/)
  assert.match(entryTheme,/\.mode-guard \.guard-phone-search button \{[\s\S]*background: var\(--primary\) !important/)
  assert.match(entryServiceWorker,/nomad-vip-entry-v19-indigo/)
})

test('staff theme loads after legacy presentation layers',()=>{
  const premium=staffApp.search(/import ["']\.\/premium\.css["']/)
  const workbench=staffApp.search(/import ["']\.\/workbench\.css["']/)
  const theme=staffApp.search(/import ["']\.\/theme\.css["']/)
  assert.ok(premium>=0 && workbench>premium && theme>workbench)
  assert.doesNotMatch(staffIndex,/#070708|color-scheme:dark/)
})

test('theme defaults to light, persists choice, and updates browser chrome',()=>{
  for(const source of [entryThemeRuntime,managerThemeRuntime,staffThemeRuntime]){
    assert.match(source,/vipclub-theme/)
    assert.match(source,/storedtheme\(\) \?\? 'light'/)
    assert.doesNotMatch(source,/prefers-color-scheme/)
    assert.match(source,/meta\[name="theme-color"\]/)
  }
  assert.match(managerMain,/initializetheme\(\)/)
  assert.match(entryMain,/initializetheme\(\)/)
})

test('dark mode control is placed in profile settings',()=>{
  for(const source of [entryHeader,managerLive]){
    assert.match(source,/profile-theme-setting|live-theme-setting/)
    assert.match(source,/night горим|анхны тохиргоо light байна/)
  }
  assert.match(staffApp,/profilepreferences/)
  assert.match(staffApp,/харанхуй горим/)
})

test('installable employee apps use the light launch canvas before runtime theme selection',()=>{
  for(const source of [staffHtml,staffManifest,entryHtml,entryManifest]){
    assert.match(source,/#f9fafb/)
    assert.doesNotMatch(source,/#070708|#080707|black-translucent/)
  }
})
