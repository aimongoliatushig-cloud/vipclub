export const entertainer = {
  name: 'Ану',
  fullName: 'Бат-Эрдэнийн Ану',
  branch: 'NOMAD Төв салбар',
  rank: 'Silver',
  nextRank: 'Gold',
  progress: 76,
  phone: '9911 2233',
  email: 'anu@nomad.mn',
}

export const shift = {
  dateLabel: '8 сарын 2 · Ням',
  start: '19:00',
  end: '04:00',
  location: 'Үндсэн тайз · Төв салбар',
}

export const rankRequirements = [
  { label: 'Сарын борлуулалт', value: '4.8 сая / 6 сая ₮', progress: 80, done: false },
  { label: 'Ирц', value: '92% / 94%', progress: 98, done: false },
  { label: 'Давтан үйлчлүүлэгч', value: '89% / 90%', progress: 99, done: false },
]

export const payoutRows = [
  { period: '7 сарын 28–30', gross: '620,000₮', deduction: '0₮', net: '620,000₮', status: 'Олгосон' },
  { period: '7 сарын 25–27', gross: '545,000₮', deduction: '0₮', net: '545,000₮', status: 'Олгосон' },
  { period: '7 сарын 22–24', gross: '710,000₮', deduction: '0₮', net: '710,000₮', status: 'Олгосон' },
]

export const reservations = [
  { id: 1, time: '21:00', room: 'VIP Aurora', customer: 'Б.Эрдэнэ · 4 хүн', status: 'Хүлээн авсан' },
  { id: 2, time: '23:30', room: 'VIP Luna', customer: 'Давтан үйлчлүүлэгч · 3 хүн', status: 'Хариу хүлээж буй' },
]

export const notifications = [
  { title: 'Өнөөдрийн ээлж 19:00 цагт эхэлнэ', time: '10 минутын өмнө', tone: 'gold' },
  { title: 'Gold зэрэглэлийн явц 76%-д хүрлээ', time: 'Өнөөдөр 12:40', tone: 'silver' },
  { title: '21:00 цагийн захиалга хуваарьт орлоо', time: 'Өнөөдөр 11:05', tone: 'success' },
]
