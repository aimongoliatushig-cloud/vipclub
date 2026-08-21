import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const api = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const theme = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8')
const backend = readFileSync(new URL('../../nomad-vip-backend/nomad_vip/api/entry.py', import.meta.url), 'utf8')

test('entry summary reuses branch-scoped POS and linked reservation data', () => {
  assert.match(backend, /detail\.get\("recent_bills"\)/)
  assert.match(backend, /"VIP Phone Reservation"[\s\S]*"entry_event": doc\.name/)
  assert.match(backend, /"latest_bill": recent_bills\[0\] if recent_bills else None/)
  assert.match(backend, /"reservation": reservation/)
  assert.match(api, /latest_bill:RecentBill\|null/)
  assert.match(api, /reservation:PhoneReservation\|null/)
})

test('entry decision view labels previous room, dancer and bill context clearly', () => {
  assert.match(app, /ЭНЭ УДААГИЙН ЗАХИАЛГА/)
  assert.match(app, /СҮҮЛИЙН БОДИТ BILL/)
  assert.match(app, /Өмнө орсон өрөө/)
  assert.match(app, /Тухайн bill-ийн бүжигчин/)
  assert.match(app, /Давтамжтай сонголт/)
  assert.match(app, /Бүрэн түүх харах/)
  assert.match(theme, /\.insight-history-grid/)
  assert.match(theme, /@media \(max-width: 720px\)[\s\S]*\.insight-history-grid \{ grid-template-columns: 1fr; \}/)
})

test('guard phone input remains readable in the shared light and dark themes', () => {
  assert.match(theme, /\.mode-guard \.guard-phone-search input \{[\s\S]*color: var\(--ink\) !important;[\s\S]*caret-color: var\(--primary\)/)
  assert.match(theme, /\.mode-guard \.guard-phone-search input::placeholder \{ color: var\(--muted\) !important; \}/)
})
