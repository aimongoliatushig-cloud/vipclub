import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { FrappeRequestError } from '../services/frappeClient'
import { FrappeLoginRequiredError, FrappeManagementApi } from '../services/managementApi'
import type { ManagementSession } from '../shared/managementAccess'
import '../styles.css'
import '../theme.css'

const LiveManagementApplication = lazy(() => import('./LiveManagementApplication'))

type ManagementRuntimeBoundaryProps = { children: ReactNode }
type ManagementRuntimeBoundaryState = { error: Error | null; refreshing: boolean }

export class ManagementRuntimeBoundary extends Component<ManagementRuntimeBoundaryProps, ManagementRuntimeBoundaryState> {
  state: ManagementRuntimeBoundaryState = { error: null, refreshing: false }

  static getDerivedStateFromError(error: Error): Partial<ManagementRuntimeBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Management workspace failed to load.', error, info)
  }

  private refreshAssets = async () => {
    this.setState({ refreshing: true })
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        const managerPath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname
        await Promise.all(
          registrations
            .filter((registration) => new URL(registration.scope).pathname.startsWith(managerPath))
            .map((registration) => registration.unregister()),
        )
      }
    } catch (error) {
      console.warn('Could not clear the manager service worker before refresh.', error)
    } finally {
      const nextUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
      nextUrl.searchParams.set('refresh', Date.now().toString())
      window.location.replace(nextUrl.toString())
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    const isVersionMismatch = /dynamically imported module|loading chunk|chunkloaderror/i.test(this.state.error.message)

    return (
      <main className="server-entry">
        <section role="alert">
          <img src={`${import.meta.env.BASE_URL}vip-club-mark.svg`} alt="VIP Club" />
          <span>Удирдлагын систем</span>
          <h1>{isVersionMismatch ? 'Шинэ хувилбарыг ачаална уу' : 'Удирдлагын хэсгийг нээж чадсангүй'}</h1>
          <p>{isVersionMismatch ? 'Хөтөч дээр өмнөх хувилбар хадгалагдсан байна.' : 'Мэдээллийг дэлгэцэд харуулах үед алдаа гарлаа.'} Таны нэвтрэлт болон оруулсан мэдээлэл устахгүй.</p>
          <button
            className="live-button live-button--primary"
            type="button"
            disabled={this.state.refreshing}
            onClick={() => void this.refreshAssets()}
          >
            {this.state.refreshing ? 'Шинэчилж байна…' : isVersionMismatch ? 'Шинэ хувилбар ачаалах' : 'Дахин ачаалах'}
          </button>
        </section>
      </main>
    )
  }
}

function ServerManagementEntry() {
  const api = useMemo(() => new FrappeManagementApi(), [])
  const [session, setSession] = useState<ManagementSession | null>(null)
  const [phase, setPhase] = useState<'checking' | 'guest' | 'ready' | 'denied' | 'error'>('checking')
  const [error, setError] = useState('')

  const loadSession = useCallback(async () => {
    setError('')
    try {
      const nextSession = await api.getSession()
      setSession(nextSession)
      setPhase('ready')
    } catch (caught) {
      setSession(null)
      if (caught instanceof FrappeLoginRequiredError || (caught instanceof FrappeRequestError && caught.status === 401)) {
        setPhase('guest')
      } else if (caught instanceof FrappeRequestError && caught.status === 403) {
        setError('Таны хэрэглэгчид гүйцэтгэх захирал эсвэл салбарын менежерийн эрх тохируулаагүй байна.')
        setPhase('denied')
      } else {
        setError(caught instanceof Error ? caught.message : 'Системтэй холбогдож чадсангүй.')
        setPhase('error')
      }
    }
  }, [api])

  useEffect(() => { void loadSession() }, [loadSession])
  useEffect(() => {
    if (phase !== 'guest' && phase !== 'denied') return
    // /staff/ is the single login entry for every employee. An authenticated
    // manager/CEO returns here with the same Frappe session; other roles stay
    // in their own role-scoped staff workspace without a second login.
    window.location.replace('/staff/')
  }, [phase])

  async function signOut() {
    try { await api.logout() } catch { /* Local protected state is still cleared. */ }
    setSession(null)
    setError('')
    setPhase('guest')
  }

  if (phase === 'checking') return <main className="server-entry"><section role="status"><img src={`${import.meta.env.BASE_URL}vip-club-mark.svg`} alt="VIP Club" /><h1>Таны эрхийг шалгаж байна…</h1><p>Салбар болон албан үүргийг ачаалж байна.</p></section></main>
  if (phase === 'denied') return <main className="server-entry"><section role="status"><img src={`${import.meta.env.BASE_URL}vip-club-mark.svg`} alt="VIP Club" /><span>Нэгдсэн ажилтны апп</span><h1>Таны ажлын хэсэг рүү шилжүүлж байна…</h1><p>{error}</p><a className="live-button live-button--primary" href="/staff/">Ажилтны апп руу орох</a></section></main>
  if (phase === 'error') return <main className="server-entry"><section><img src={`${import.meta.env.BASE_URL}vip-club-mark.svg`} alt="VIP Club" /><span>Удирдлагын систем</span><h1>Холболт тасарлаа</h1><p>{error}</p><button className="live-button live-button--primary" type="button" onClick={() => void loadSession()}>Дахин оролдох</button></section></main>
  if (!session) return <main className="server-entry"><section role="status"><img src={`${import.meta.env.BASE_URL}vip-club-mark.svg`} alt="VIP Club" /><span>Нэгдсэн ажилтны апп</span><h1>Нэвтрэх хэсэг рүү шилжүүлж байна…</h1><p>Бүх ажилтан нэг холбоосоор нэвтэрч, өөрийн эрхэд тохирсон хэсгийг харна.</p><a className="live-button live-button--primary" href="/staff/">Ажилтны апп руу орох</a></section></main>
  return <ManagementRuntimeBoundary><Suspense fallback={<div className="role-entry-loader" role="status">Удирдлагын ажлын орчин ачаалж байна…</div>}><LiveManagementApplication api={api} session={session} onSignOut={signOut} /></Suspense></ManagementRuntimeBoundary>
}

export default function App() {
  return <ServerManagementEntry />
}
