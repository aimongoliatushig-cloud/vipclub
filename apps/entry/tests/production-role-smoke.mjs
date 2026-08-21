import assert from 'node:assert/strict'
import {existsSync} from 'node:fs'
import {homedir, tmpdir} from 'node:os'
import {join} from 'node:path'
import {createRequire} from 'node:module'

const require=createRequire(import.meta.url)

function loadPlaywright(){
  try{return require('playwright')}catch(localError){
    const candidates=[
      process.env.NOMAD_PLAYWRIGHT_MODULE,
      join(homedir(),'.cache','codex-runtimes','codex-primary-runtime','dependencies','node','node_modules','playwright'),
    ].filter(Boolean)
    for(const candidate of candidates){
      if(existsSync(join(candidate,'package.json'))) return require(candidate)
    }
    throw new Error(`Playwright олдсонгүй: ${localError.message}`)
  }
}

function chromeExecutable(){
  return [
    process.env.NOMAD_CHROME_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean).find(existsSync)
}

const password=process.env.NOMAD_QA_ROLE_PASSWORD
assert.ok(password,'NOMAD_QA_ROLE_PASSWORD шаардлагатай')

const roles=[
  {name:'guard',user:'guard.nomad@vipclub.local',heading:'Үүдний нэвтрүүлэлт',viewport:{width:390,height:844}},
  {name:'operator',user:'operation@vipclub.local',heading:'Утасны бүртгэл',viewport:{width:768,height:1024}},
  {name:'operator-desktop',user:'operation@vipclub.local',heading:'Утасны бүртгэл',viewport:{width:1440,height:900}},
]

const {chromium}=loadPlaywright()
const browser=await chromium.launch({headless:true,...(chromeExecutable()?{executablePath:chromeExecutable()}:{})})
const results=[]

try{
  for(const role of roles){
    const context=await browser.newContext({viewport:role.viewport,deviceScaleFactor:1})
    const page=await context.newPage()
    const errors=[]
    page.on('console',message=>{if(message.type()==='error') errors.push(message.text())})
    page.on('pageerror',error=>errors.push(error.message))
    await page.goto('https://srv1871758.hstgr.cloud/staff/',{waitUntil:'domcontentloaded',timeout:45000})
    await page.locator('input[autocomplete="username"]').fill(role.user)
    await page.locator('input[autocomplete="current-password"]').fill(password)
    await page.getByRole('button',{name:'Нэвтрэх'}).click()
    await page.waitForURL(/\/vip-entry\//,{timeout:45000})
    await page.getByRole('heading',{name:role.heading,exact:true}).waitFor({state:'visible',timeout:45000})
    await page.waitForTimeout(3500)
    const bodyText=(await page.locator('body').innerText()).trim()
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
    assert.ok(bodyText.length>80,`${role.name}: хоосон/хар дэлгэц`)
    assert.ok(overflow<=1,`${role.name}: хэвтээ overflow ${overflow}px`)
    assert.deepEqual(errors,[],`${role.name}: browser error`)
    const screenshot=join(tmpdir(),`vip-entry-${role.name}-${role.viewport.width}x${role.viewport.height}.png`)
    await page.screenshot({path:screenshot,fullPage:true})
    results.push({role:role.name,viewport:`${role.viewport.width}x${role.viewport.height}`,final_url:new URL(page.url()).pathname,body_text_length:bodyText.length,overflow,screenshot})
    await context.close()
  }
}finally{
  await browser.close()
}

console.log(JSON.stringify(results,null,2))
