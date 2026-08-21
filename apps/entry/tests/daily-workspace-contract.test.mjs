import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const api=readFileSync(new URL('../src/api.ts',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')

test('guard and operator workspaces normalize incomplete live payloads',()=>{
  assert.match(api,/export function normalizeDailyEntryWorkspace/)
  assert.match(api,/items\.filter\(item=>item\.status==='Scheduled'\)\.length/)
  assert.match(api,/guardWaitlist:async[\s\S]*normalizeDailyEntryWorkspace/)
  assert.match(api,/phoneReservations:async[\s\S]*normalizeDailyEntryWorkspace/)
})

test('day metrics cannot dereference a missing summary',()=>{
  assert.match(app,/workspace\?\.summary\?\.waiting/)
  assert.match(app,/workspace\?\.summary\?\.arrived/)
  assert.match(app,/workspace\?\.summary\?\.cancelled/)
  assert.doesNotMatch(app,/workspace\?\.summary\.(waiting|arrived|cancelled)/)
})

test('operator submits the selected arrival time and confirms cancellation',()=>{
  assert.match(api,/createPhoneReservation:\(values:\{[^}]*expected_at:string/)
  assert.match(app,/className="operation-time-picker"/)
  assert.match(app,/aria-label="Ирэх минут"/)
  assert.match(app,/expected_at: nextReservationTime\(\)/)
  assert.match(app,/role="alertdialog"/)
  assert.match(app,/Захиалгыг цуцлах уу\?/)
})

test('login prioritizes phone numbers while retaining a username fallback',()=>{
  assert.match(app,/Утасны дугаар[\s\S]*type="text"[\s\S]*inputMode="tel"/)
  assert.match(app,/\^\\\+\?\[\\d\\s\(\)-\]\+\$/)
  assert.doesNotMatch(app,/Утасны дугаар[\s\S]{0,200}type="email"/)
})

test('manager sees cross-branch ban reasons without applying them to the current branch',()=>{
  assert.match(api,/branch_ban_notices\?:BranchBanNotice\[\]/)
  assert.match(app,/notice\.branch !== detail\.scope_branch/)
  assert.match(app,/Энэ салбарт хориггүй\. Өөр салбарын тэмдэглэл байна\./)
  assert.match(app,/нэвтрэх эрхийг автоматаар хориглохгүй/)
  assert.match(app,/Шалтгаан нь бусад салбарын менежерт харагдана/)
})

test('manager can search before entry and must confirm a branch ban',()=>{
  assert.match(api,/managerCustomerSearch:\(phone:string\)/)
  assert.match(app,/searchCustomerBeforeEntry/)
  assert.match(app,/НЭВТРЭХ ЭРХИЙН УРЬДЧИЛСАН ШАЛГАЛТ/)
  assert.match(app,/role="alertdialog"/)
  assert.match(app,/Тийм, ban хийх/)
  assert.match(app,/ctx\.mode !== "manager" && ctx\.entry_access_required/)
})
