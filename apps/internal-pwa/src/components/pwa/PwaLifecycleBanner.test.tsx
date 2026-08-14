import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PwaStatusNotice, type PwaNotice } from './PwaLifecycleBanner'

describe('PWA lifecycle notice', () => {
  it('renders install, iPhone, update, offline-ready and reconnect guidance in Mongolian', () => {
    const notices: PwaNotice[] = [
      { kind: 'install', title: 'VIP Club апп суулгах боломжтой', detail: 'Энэ төхөөрөмжид суулгана.' },
      { kind: 'ios', title: 'iPhone дээр апп болгон суулгах', detail: 'Share → Add to Home Screen.' },
      { kind: 'update', title: 'Аппын шинэ хувилбар бэлэн', detail: 'Шинэчилж дахин ачаална.' },
      { kind: 'offline-ready', title: 'Офлайнаар нээхэд бэлэн', detail: 'Нууц API өгөгдөл cache-д орохгүй.' },
      { kind: 'reconnected', title: 'Холболт баталгаажлаа', detail: 'Эрхийн хүрээг дахин шалгалаа.' },
    ]
    const view = render(<PwaStatusNotice notice={notices[0]} onDismiss={() => undefined} />)

    for (const notice of notices) {
      view.rerender(<PwaStatusNotice notice={notice} onDismiss={() => undefined} />)
      expect(screen.getByText(notice.title)).toBeVisible()
      expect(screen.getByText(notice.detail)).toBeVisible()
      expect(screen.getByRole('button', { name: `${notice.title} мэдэгдлийг хаах` })).toBeVisible()
    }
  })

  it('keeps update execution behind an explicit action', async () => {
    const user = userEvent.setup()
    let actions = 0
    render(
      <PwaStatusNotice
        notice={{ kind: 'update', title: 'Аппын шинэ хувилбар бэлэн', detail: 'Ажлаа хадгална уу.', actionLabel: 'Шинэчилж нээх' }}
        onAction={() => { actions += 1 }}
        onDismiss={() => undefined}
      />,
    )

    expect(actions).toBe(0)
    await user.click(screen.getByRole('button', { name: 'Шинэчилж нээх' }))
    expect(actions).toBe(1)
  })
})
