import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { WeeklySchedulePage } from './WeeklySchedulePage'
import { formatDate, formatDateTime } from './localization'
import { BrowserWorkforceService, resetWorkforcePrototype } from './workforceService'

describe('WeeklySchedulePage', () => {
  beforeEach(() => resetWorkforcePrototype())

  it('renders the primary manager experience in Mongolian', () => {
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)

    const navigation = screen.getByRole('navigation', { name: 'Менежерийн навигац' })
    expect(navigation).toHaveTextContent('Тойм')
    expect(navigation).toHaveTextContent('Долоо хоногийн хуваарь')
    expect(navigation).toHaveTextContent('Хангалт')
    expect(navigation).toHaveTextContent('Ирц')
    expect(navigation).toHaveTextContent('Багийн гишүүд')
    expect(navigation).toHaveTextContent('Харилцагч')
    expect(navigation).toHaveTextContent('Зэрэглэл')
    expect(screen.queryByText('Manager overview')).not.toBeInTheDocument()
    expect(screen.queryByText('Weekly schedule')).not.toBeInTheDocument()
  })

  it('formats dates and times without English locale fallbacks', () => {
    expect(formatDate('2026-08-10T23:15:00+08:00', { month: 'short', day: 'numeric' })).toBe('8-р сарын 10')
    expect(formatDate('2026-08-13', { weekday: 'long', month: 'long', day: 'numeric' })).toBe('Пүрэв гараг, 8-р сарын 13')
    expect(formatDateTime(new Date(2026, 7, 13, 13, 6))).toBe('2026 оны 8-р сарын 13, 13:06')
  })

  it('shows branch-scoped roster, coverage, and publication review', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Долоо хоногийн хуваарь' }))

    expect(screen.getByRole('heading', { name: 'Долоо хоногийн хуваарь' })).toBeInTheDocument()
    expect(screen.getByText('Зөвшөөрөгдсөн салбарын хүрээ')).toBeInTheDocument()
    expect(screen.getByText('Нээлттэй хангалтын дутагдал')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Хянаж нийтлэх' }))
    expect(screen.getByRole('dialog', { name: /долоо хоног/ })).toBeInTheDocument()
    expect(screen.getByText(/^2 хангалтын дутагдал$/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Доод хэмжээнээс дутуугаар нийтлэх шалтгаан/)).toBeInTheDocument()
  })

  it('adds a draft shift from an empty team-member day', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Долоо хоногийн хуваарь' }))

    const addButtons = screen.getAllByRole('button', { name: /Бат Ану-д .* ээлж нэмэх/ })
    await user.click(addButtons[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Ээлж'), 'Day')
    await user.click(screen.getByRole('button', { name: /Ээлж хадгалах/ }))

    expect(screen.getByRole('status')).toHaveTextContent('Ноорог ээлж хадгалагдлаа')
  })

  it('edits staffing requirements and exposes the resulting audit evidence', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Долоо хоногийн хуваарь' }))

    await user.click(screen.getByRole('button', { name: /Хүний нөөцийн шаардлага/ }))
    expect(screen.getByRole('dialog', { name: 'Шаардлагатай хүний доод тоо' })).toBeInTheDocument()
    const bartenderRequirement = screen.getAllByRole('spinbutton', { name: /Бармен үүрэгт шаардлагатай хүний тоо/ })[0]
    await user.clear(bartenderRequirement)
    await user.type(bartenderRequirement, '2')
    await user.type(screen.getByLabelText(/Өөрчлөх шалтгаан/), 'Даваа гарагийн арга хэмжээнд хоёр дахь бармен хэрэгтэй.')
    await user.click(screen.getByRole('button', { name: /Шаардлага хадгалах/ }))

    expect(screen.getByRole('status')).toHaveTextContent('2-р хувилбараар')
    await user.click(screen.getByRole('button', { name: /Аудитын баримт/ }))
    expect(screen.getByRole('dialog', { name: 'Аудитын бүрэн түүх' })).toHaveTextContent('Хүний нөөцийн доод шаардлага шинэчилсэн')
  })

  it('records a CEO follow-up task from objective schedule evidence', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Долоо хоногийн хуваарь' }))

    await user.click(screen.getByRole('button', { name: /Гүйцэтгэх захирлын хяналт/ }))
    const dialog = screen.getByRole('dialog', { name: 'Салбарын хяналт' })
    expect(dialog).toHaveTextContent('Үйлдэл бүртгэгдээгүйгээс ажлын хүчин чармайлтыг таамаглахгүй')
    expect(dialog).toHaveTextContent('Менежерийн хамгийн сүүлд бүртгэсэн үйлдэл')
    await user.click(screen.getByRole('button', { name: 'Хяналтын даалгавар үүсгэх' }))
    await user.click(screen.getByRole('button', { name: 'Даалгавар үүсгэх' }))

    expect(screen.getByRole('status')).toHaveTextContent('Гүйцэтгэх захирлын хяналтын даалгаврыг')
    expect(dialog).toHaveTextContent('Сүүлийнх: даалгаврын хугацаа')
  })

  it('keeps draft assignments private from the team-member preview', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Долоо хоногийн хуваарь' }))

    await user.click(screen.getByRole('button', { name: /Хариуны жагсаалт/ }))
    expect(screen.getByRole('dialog', { name: 'Ээлжийн хариунууд' })).toHaveTextContent('Хуваарь нийтэлсний дараа хариу авч эхэлнэ')
    await user.click(screen.getByRole('button', { name: 'Багийн гишүүний харагдац нээх' }))
    expect(screen.getByRole('dialog', { name: 'Миний нийтэлсэн хуваарь' })).toHaveTextContent('Нийтэлсэн хуваарь алга')
  })

  it('routes a team-member change request into the manager response queue', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Долоо хоногийн хуваарь' }))

    await user.click(screen.getByRole('button', { name: 'Хянаж нийтлэх' }))
    await user.type(screen.getByLabelText(/Доод хэмжээнээс дутуугаар нийтлэх шалтгаан/), 'Зөвшөөрсөн хоёр дутагдлыг нөхөн бүрдүүлж байна.')
    await user.click(screen.getByRole('button', { name: 'Хуваарь нийтлэх' }))
    await user.click(screen.getByRole('button', { name: /Хариуны жагсаалт/ }))
    expect(screen.getByRole('dialog', { name: 'Ээлжийн хариунууд' })).toHaveTextContent('42')
    await user.click(screen.getByRole('button', { name: 'Багийн гишүүний харагдац нээх' }))
    await user.click(screen.getAllByRole('button', { name: 'Өөрчлөлт хүсэх' })[0])
    await user.type(screen.getByLabelText('Яагаад өөрчлөлт хэрэгтэй вэ?'), 'Хичээл энэ ээлж эхэлсний дараа тарна.')
    await user.click(screen.getByRole('button', { name: 'Хүсэлт илгээх' }))

    expect(screen.getByRole('status')).toHaveTextContent('өөрчлөх хүсэлтийг салбарын менежерийн жагсаалтад нэмлээ')
    await user.click(screen.getByRole('button', { name: 'Багийн гишүүний хуваарийн харагдацыг хаах' }))
    await user.click(screen.getByRole('button', { name: /Хариуны жагсаалт/ }))
    const queue = screen.getByRole('dialog', { name: 'Ээлжийн хариунууд' })
    expect(queue).toHaveTextContent('Өөрчлөлт хүссэн')
    expect(queue).toHaveTextContent('Хичээл энэ ээлж эхэлсний дараа тарна.')
  }, 10_000)

  it('records acknowledgement and reminder evidence without changing roster version', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Долоо хоногийн хуваарь' }))

    await user.click(screen.getByRole('button', { name: 'Хянаж нийтлэх' }))
    await user.type(screen.getByLabelText(/Доод хэмжээнээс дутуугаар нийтлэх шалтгаан/), 'Зөвшөөрсөн хоёр дутагдлыг нөхөн бүрдүүлж байна.')
    await user.click(screen.getByRole('button', { name: 'Хуваарь нийтлэх' }))
    await user.click(screen.getByRole('button', { name: /Хариуны жагсаалт/ }))
    await user.click(screen.getAllByRole('button', { name: 'Сануулга тэмдэглэх' })[0])
    expect(screen.getByRole('status')).toHaveTextContent('мэдэгдэл илгээгээгүй')
    expect(screen.getByRole('dialog', { name: 'Ээлжийн хариунууд' })).toHaveTextContent('нийт 1')
    await user.click(screen.getByRole('button', { name: 'Багийн гишүүний харагдац нээх' }))
    await user.click(screen.getAllByRole('button', { name: 'Хүлээн авснаа батлах' })[0])
    expect(screen.getByRole('status')).toHaveTextContent('хүлээн авснаа баталгаажууллаа')
    expect(screen.getAllByText('Нийтэлсэн · хувилбар 1').length).toBeGreaterThan(0)
  }, 10_000)

  it('opens the completed manager overview, coverage, and branch-only team views', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)

    expect(screen.getByRole('heading', { name: 'Менежерийн тойм' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Салбарын ажиллах хүчний одоогийн төлөв' })).toHaveTextContent('Ээлж дээр6')
    expect(screen.getByText('Төв салбар · зөвшөөрөгдсөн хүрээ')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Хангалт/ }))
    expect(screen.getByRole('heading', { name: 'Хангалт ба бэлэн байдал' })).toBeInTheDocument()
    expect(screen.getByText(/Ноорог үед ирцийн бэлэн байдлыг тооцохгүй/)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Багийн гишүүд' }))
    expect(screen.getByRole('heading', { name: 'Багийн гишүүд' })).toBeInTheDocument()
    expect(screen.getByText('Зэрэглэл өөрчлөх эрх түгжигдсэн')).toBeInTheDocument()
    expect(screen.queryByText(/salary|bank account|customer bill/i)).not.toBeInTheDocument()
  })

  it('records an attendance correction decision from preserved source evidence', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Долоо хоногийн хуваарь' }))
    await user.click(screen.getByRole('button', { name: 'Хянаж нийтлэх' }))
    await user.type(screen.getByLabelText(/Доод хэмжээнээс дутуугаар нийтлэх шалтгаан/), 'Зөвшөөрсөн хоёр дутагдлыг нөхөн бүрдүүлж байна.')
    await user.click(screen.getByRole('button', { name: 'Хуваарь нийтлэх' }))
    await user.click(screen.getByRole('link', { name: 'Ирц' }))

    expect(screen.getByRole('heading', { name: 'Ирцийн хяналт' })).toBeInTheDocument()
    expect(screen.getAllByText(/Залруулгын хүсэлт/).length).toBeGreaterThan(0)
    await user.type(screen.getByLabelText('Менежерийн шийдвэрийн шалтгаан'), 'Хамгаалалтын бүртгэл ирсэн цагийг баталсан.')
    await user.click(screen.getByRole('button', { name: 'Зөвшөөрөх' }))

    expect(screen.getByRole('status')).toHaveTextContent('Ирцийн “Зөвшөөрөх” шийдвэрийг тэмдэглэлээ')
    await user.click(screen.getByRole('button', { name: 'Бүх баримт' }))
    expect(screen.getByText(/Ариун менежер “Зөвшөөрөх” шийдвэр тэмдэглэсэн/)).toBeInTheDocument()
  })

  it('records a reason-required availability override from the team view', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Багийн гишүүд' }))

    await user.selectOptions(screen.getByLabelText('Өөрчлөх төлөв'), 'unavailable')
    await user.type(screen.getByLabelText('Шалтгаан'), 'Зөвшөөрсөн сургалтын давхцлыг менежер тэмдэглэв.')
    await user.click(screen.getByRole('button', { name: 'Боломжийг хадгалах' }))

    expect(screen.getByRole('status')).toHaveTextContent('ажиллах боломжийн өөрчлөлтийг тэмдэглэлээ')
    expect(screen.getByText(/Сүүлийн өөрчлөлт: боломжгүй/)).toBeInTheDocument()
  })

  it('shows a masked branch-only customer intelligence view with working filters', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Харилцагч' }))

    expect(screen.getByRole('heading', { name: 'Харилцагчийн удирдлага' })).toBeInTheDocument()
    expect(screen.getByText('Төв салбар · нууцлалтай харилцагчийн харагдац')).toBeInTheDocument()
    expect(screen.getAllByText(/•••• 4821/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Иргэний үнэмлэх, бүтэн утас/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Гишүүнчлэлийн түвшнээр шүүх'), 'diamond')
    expect(screen.getByRole('button', { name: /Тэмүүлэн Б\./ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Саруул Н\./ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /экспорт/i })).not.toBeInTheDocument()
  })

  it('shows explainable team and customer ranking evidence without override actions', async () => {
    const user = userEvent.setup()
    render(<WeeklySchedulePage service={new BrowserWorkforceService()} />)
    await user.click(screen.getByRole('link', { name: 'Зэрэглэл' }))

    expect(screen.getByRole('heading', { name: 'Зэрэглэлийн хяналт' })).toBeInTheDocument()
    expect(screen.getByText(/Батлагдсан суурийг харуулна, шийдвэр автоматжихгүй/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Мөнх Нараа/ }))
    expect(screen.getByText('Шийдэгдээгүй ирээгүй тохиолдол')).toBeInTheDocument()
    expect(screen.getByText('Зэрэглэл өөрчлөх эрх түгжигдсэн')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /зэрэглэл өөрчлөх/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Харилцагчийн түвшин' }))
    await user.click(screen.getByRole('button', { name: /Оюун Э\./ }))
    expect(screen.getAllByText('Шинэ / түр').length).toBeGreaterThan(0)
    expect(screen.getByText('Зочлолт бүрийн дундажийн тайлбар')).toBeInTheDocument()
    expect(screen.getByText('Гишүүнчлэлийн түвшин автоматаар өөрчлөгдөхгүй')).toBeInTheDocument()
    expect(screen.queryByText(/буцаан олголтын үлдэгдэл/i)).not.toBeInTheDocument()
  })
})
