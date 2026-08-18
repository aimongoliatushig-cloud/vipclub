import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, RefreshCw, Smartphone, Wifi, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PwaNotice {
  kind: 'install' | 'ios' | 'update' | 'offline-ready' | 'reconnected' | 'installed' | 'error'
  title: string
  detail: string
  actionLabel?: string
  busy?: boolean
}

const iconByKind = {
  install: Download,
  ios: Smartphone,
  update: RefreshCw,
  'offline-ready': CheckCircle2,
  reconnected: Wifi,
  installed: CheckCircle2,
  error: RefreshCw,
} as const

export function PwaStatusNotice({ notice, onAction, onDismiss }: { notice: PwaNotice; onAction?(): void; onDismiss(): void }) {
  const Icon = iconByKind[notice.kind]
  return (
    <div className="pwa-lifecycle-banner" data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <Icon size={19} aria-hidden="true" />
      <div>
        <strong>{notice.title}</strong>
        <span>{notice.detail}</span>
      </div>
      {notice.actionLabel && onAction ? (
        <button className="button button--secondary" type="button" onClick={onAction} disabled={notice.busy}>
          {notice.actionLabel}
        </button>
      ) : null}
      <button className="icon-button" type="button" onClick={onDismiss} aria-label={`${notice.title} мэдэгдлийг хаах`}>
        <X size={17} aria-hidden="true" />
      </button>
    </div>
  )
}

export function PwaLifecycleBanner({ online, onReconnect }: { online: boolean; onReconnect(): Promise<void> }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installState, setInstallState] = useState<'idle' | 'prompting' | 'installed' | 'dismissed'>('idle')
  const [iosDismissed, setIosDismissed] = useState(false)
  const [reconnectState, setReconnectState] = useState<'checking' | 'ready' | 'failed' | null>(null)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const previousOnline = useRef(online)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      setRegistrationError(error instanceof Error ? error.message : 'Service worker бүртгэл амжилтгүй боллоо.')
    },
  })

  const standalone = typeof window !== 'undefined' && (
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
  const ios = typeof window !== 'undefined' && /iphone|ipad|ipod/i.test(window.navigator.userAgent)

  useEffect(() => {
    const captureInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setInstallState('idle')
    }
    const confirmInstalled = () => {
      setInstallEvent(null)
      setInstallState('installed')
    }
    window.addEventListener('beforeinstallprompt', captureInstall)
    window.addEventListener('appinstalled', confirmInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstall)
      window.removeEventListener('appinstalled', confirmInstalled)
    }
  }, [])

  useEffect(() => {
    const wasOnline = previousOnline.current
    previousOnline.current = online
    if (wasOnline || !online) return
    setReconnectState('checking')
    void onReconnect()
      .then(() => setReconnectState('ready'))
      .catch(() => setReconnectState('failed'))
  }, [online, onReconnect])

  const install = async () => {
    if (!installEvent) return
    setInstallState('prompting')
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)
    setInstallState(choice.outcome === 'accepted' ? 'installed' : 'dismissed')
  }

  let notice: PwaNotice | null = null
  let onAction: (() => void) | undefined
  let onDismiss = () => setReconnectState(null)

  if (reconnectState) {
    notice = reconnectState === 'checking'
      ? { kind: 'reconnected', title: 'Холболт сэргэв', detail: 'Эрх ба шинэ өгөгдлийг серверээс дахин баталгаажуулж байна.', busy: true }
      : reconnectState === 'ready'
        ? { kind: 'reconnected', title: 'Холболт баталгаажлаа', detail: 'Шинэ өгөгдөл болон эрхийн хүрээг дахин шалгалаа.' }
        : { kind: 'error', title: 'Холболт сэргэсэн ч шинэчилж чадсангүй', detail: 'Сүүлчийн аюулгүй төлөв хэвээр. Дээд талын “Дахин оролдох” үйлдлийг ашиглана уу.' }
  } else if (needRefresh) {
    notice = { kind: 'update', title: 'Аппын шинэ хувилбар бэлэн', detail: 'Ажлаа хадгалсны дараа шинэчилж дахин ачаална уу.', actionLabel: 'Шинэчилж нээх' }
    onAction = () => { void updateServiceWorker(true) }
    onDismiss = () => setNeedRefresh(false)
  } else if (offlineReady) {
    notice = { kind: 'offline-ready', title: 'Офлайнаар нээхэд бэлэн', detail: 'Зөвхөн аппын бүрхүүл ба статик файл хадгалагдсан; нууц API өгөгдөл cache-д орохгүй.' }
    onDismiss = () => setOfflineReady(false)
  } else if (registrationError) {
    notice = { kind: 'error', title: 'Аппын шинэчлэл шалгаж чадсангүй', detail: `Одоогийн хувилбар хэвийн ажиллана. ${registrationError}` }
    onDismiss = () => setRegistrationError(null)
  } else if (installEvent && installState !== 'dismissed' && !standalone) {
    notice = { kind: 'install', title: 'VIP Club апп суулгах боломжтой', detail: 'Энэ төхөөрөмжийн үндсэн дэлгэцээс хурдан, тусдаа цонхоор нээнэ.', actionLabel: installState === 'prompting' ? 'Хүлээж байна…' : 'Апп суулгах', busy: installState === 'prompting' }
    onAction = () => { void install() }
    onDismiss = () => {
      setInstallEvent(null)
      setInstallState('dismissed')
    }
  } else if (ios && !standalone && !iosDismissed) {
    notice = { kind: 'ios', title: 'iPhone дээр апп болгон суулгах', detail: 'Safari-ийн Share цэснээс “Add to Home Screen”-ийг сонгоно уу.' }
    onDismiss = () => setIosDismissed(true)
  } else if (installState === 'installed') {
    notice = { kind: 'installed', title: 'VIP Club апп суулгагдлаа', detail: 'Үндсэн дэлгэцийн дүрсээр тусдаа, аюулгүй ажлын цонх нээнэ.' }
    onDismiss = () => setInstallState('dismissed')
  }

  return notice ? <PwaStatusNotice notice={notice} onAction={onAction} onDismiss={onDismiss} /> : null
}
