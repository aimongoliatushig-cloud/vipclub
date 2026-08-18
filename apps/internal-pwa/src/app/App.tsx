import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { FrappeRequestError } from '../services/frappeClient'
import { FrappeLoginRequiredError, FrappeManagementApi } from '../services/managementApi'
import type { ManagementSession } from '../shared/managementAccess'
import { RoleLoginPage } from './RoleLoginPage'
import { BrowserSessionStore, type SessionStore } from './sessionStore'
import '../styles.css'

const ExecutiveEntry = lazy(() => import('./ExecutiveEntry'))
const ManagerApplication = lazy(() => import('../features/workforce/ManagerApplication'))
const LiveManagementApplication = lazy(() => import('./LiveManagementApplication'))

export interface AppProps {
  initialSession?: ManagementSession | null
  sessionStore?: SessionStore
  dataSource?: 'demo' | 'frappe'
}

function ServerManagementEntry() {
  const api = useMemo(() => new FrappeManagementApi(), [])
  const [session, setSession] = useState<ManagementSession | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.getSession().then((nextSession) => {
      if (active) setSession(nextSession)
    }).catch((caught) => {
      if (!active) return
      if (caught instanceof FrappeLoginRequiredError || (caught instanceof FrappeRequestError && caught.status === 401)) {
        window.location.replace(`/login?redirect-to=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      } else if (caught instanceof FrappeRequestError && caught.status === 403) {
        setError('Таны NextERP хэрэглэгчид CEO эсвэл салбарын менежерийн эрх тохируулаагүй байна. Администраторт хандана уу.')
      } else {
        setError(caught instanceof Error ? caught.message : 'NextERP-тэй холбогдож чадсангүй.')
      }
    })
    return () => { active = false }
  }, [api])

  if (error) return <main className="server-entry"><section><img src={`${import.meta.env.BASE_URL}vip-club-mark.svg`} alt="VIP Club" /><span>Удирдлагын систем</span><h1>Хандах эрх хүрэлцэхгүй байна</h1><p>{error}</p><a className="live-button live-button--primary" href="/app">NextERP рүү очих</a></section></main>
  if (!session) return <main className="server-entry"><section role="status"><img src={`${import.meta.env.BASE_URL}vip-club-mark.svg`} alt="VIP Club" /><h1>Таны эрхийг шалгаж байна…</h1><p>NextERP-ээс салбар болон албан үүргийг ачаалж байна.</p></section></main>
  return <Suspense fallback={<div className="role-entry-loader" role="status">Удирдлагын ажлын орчин ачаалж байна…</div>}><LiveManagementApplication api={api} session={session} /></Suspense>
}

function DemoManagementEntry({ initialSession, sessionStore }: { initialSession?: ManagementSession | null; sessionStore: SessionStore }) {
  const [session, setSession] = useState<ManagementSession | null>(() => initialSession === undefined ? sessionStore.read() : initialSession)

  function signIn(nextSession: ManagementSession) {
    sessionStore.write(nextSession)
    setSession(nextSession)
  }

  function signOut() {
    sessionStore.clear()
    setSession(null)
  }

  if (!session) return <RoleLoginPage onSignIn={signIn} />

  if (session.role === 'ceo') {
    return <Suspense fallback={<div className="role-entry-loader" role="status">Гүйцэтгэх захирлын ажлын орчин ачаалж байна…</div>}><ExecutiveEntry session={session} onSignOut={signOut} /></Suspense>
  }

  return <Suspense fallback={<div className="role-entry-loader" role="status">Менежерийн ажлын орчин ачаалж байна…</div>}><ManagerApplication session={session} onSignOut={signOut} /></Suspense>
}

export default function App({ initialSession, sessionStore = new BrowserSessionStore(), dataSource = import.meta.env.VITE_DATA_SOURCE === 'frappe' ? 'frappe' : 'demo' }: AppProps) {
  return dataSource === 'frappe'
    ? <ServerManagementEntry />
    : <DemoManagementEntry initialSession={initialSession} sessionStore={sessionStore} />
}
