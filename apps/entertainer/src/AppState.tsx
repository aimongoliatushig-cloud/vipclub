import { AlertTriangle, Home, LogIn, LogOut, RefreshCw, ShieldX, WifiOff } from 'lucide-react'

type StateKind = 'offline' | 'forbidden' | 'error'

const stateIcon = {
  offline: WifiOff,
  forbidden: ShieldX,
  error: AlertTriangle,
}

export function StartupState({
  kind,
  title,
  message,
  busy = false,
  onRetry,
}: {
  kind: StateKind
  title: string
  message: string
  busy?: boolean
  onRetry: () => void
}) {
  const Icon = stateIcon[kind]
  return <main className={`runtime-screen runtime-screen--${kind}`}>
    <section className="runtime-state-card" role={kind === 'error' ? 'alert' : 'status'}>
      <span className="runtime-state-icon"><Icon /></span>
      <div className="runtime-state-copy">
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
      <button className="runtime-primary-action" type="button" onClick={onRetry} disabled={busy}>
        <RefreshCw className={busy ? 'spin' : ''} />
        {busy ? 'Шалгаж байна…' : 'Дахин оролдох'}
      </button>
    </section>
  </main>
}

export function AccessDeniedState({ onHome }: { onHome: () => void }) {
  return <section className="runtime-inline-state runtime-inline-state--forbidden" role="alert">
    <span className="runtime-state-icon"><ShieldX /></span>
    <div className="runtime-state-copy">
      <span>Хандах эрх</span>
      <h1>Энэ хэсгийг нээх эрхгүй байна</h1>
      <p>Таны үүрэг, салбарт зөвшөөрөгдсөн мэдээлэл л харагдана. Эрх буруу тохирсон бол системийн админтай холбогдоно уу.</p>
    </div>
    <button className="runtime-secondary-action" type="button" onClick={onHome}><Home />Нүүр рүү буцах</button>
  </section>
}

export function UnauthorizedState({
  busy = false,
  onLogout,
}: {
  busy?: boolean
  onLogout: () => void
}) {
  return <main className="runtime-screen runtime-screen--forbidden">
    <section className="runtime-state-card" role="alert">
      <span className="runtime-state-icon"><ShieldX /></span>
      <div className="runtime-state-copy">
        <span>Хандах эрхгүй</span>
        <h1>Ажилтны мэдээлэл харах эрх алга</h1>
        <p>Энэ бүртгэлд ажилтны апп ашиглах эрх эсвэл салбарын зөвшөөрөл тохируулаагүй байна. Системээс гараад зөв бүртгэлээр нэвтэрнэ үү.</p>
      </div>
      <button className="runtime-primary-action" type="button" onClick={onLogout} disabled={busy}>
        <LogOut />{busy ? 'Системээс гарч байна…' : 'Системээс гарах'}
      </button>
    </section>
  </main>
}

export function DataUnavailableState({
  offline,
  busy = false,
  onRetry,
}: {
  offline: boolean
  busy?: boolean
  onRetry: () => void
}) {
  const Icon = offline ? WifiOff : AlertTriangle
  return <section className={`runtime-inline-state ${offline ? 'runtime-inline-state--offline' : 'runtime-inline-state--error'}`} role="alert">
    <span className="runtime-state-icon"><Icon /></span>
    <div className="runtime-state-copy">
      <span>{offline ? 'Холболт тасарсан' : 'Мэдээлэл ачаалсангүй'}</span>
      <h1>{offline ? 'Интернет холболтоо шалгана уу' : 'Мэдээллийг харуулахад алдаа гарлаа'}</h1>
      <p>{offline ? 'Сүлжээ орсны дараа энэ хуудсыг дахин ачаална уу.' : 'Таны мэдээлэл өөрчлөгдөөгүй. Түр хүлээгээд дахин оролдоно уу.'}</p>
    </div>
    <button className="runtime-secondary-action" type="button" onClick={onRetry} disabled={busy}>
      <RefreshCw className={busy ? 'spin' : ''} />{busy ? 'Ачаалж байна…' : 'Дахин ачаалах'}
    </button>
  </section>
}

export function OfflineBanner({ login = false }: { login?: boolean }) {
  return <div className="runtime-banner runtime-banner--offline" role="status">
    <WifiOff />
    <span><strong>Интернет холболт тасарсан</strong><small>{login ? 'Нэвтрэхийн тулд интернет холболтоо сэргээнэ үү.' : 'Дэлгэц дээрх мэдээллийг уншиж болно. Шинэчлэх болон хадгалах үйлдэл сүлжээ орсны дараа ажиллана.'}</small></span>
  </div>
}

export function AccessBanner({ onClose }: { onClose: () => void }) {
  return <div className="runtime-banner runtime-banner--forbidden" role="alert">
    <ShieldX />
    <span><strong>Энэ үйлдлийг хийх эрхгүй байна</strong><small>Таны салбар эсвэл үүрэгт зөвшөөрөгдөөгүй мэдээлэл байна.</small></span>
    <button type="button" onClick={onClose}>Хаах</button>
  </div>
}

export function SessionNotice() {
  return <div className="session-notice" role="status">
    <LogIn />
    <span><strong>Нэвтрэх хугацаа дууссан</strong><small>Мэдээллийн нууцлалыг хамгаалахын тулд дахин нэвтэрнэ үү.</small></span>
  </div>
}
