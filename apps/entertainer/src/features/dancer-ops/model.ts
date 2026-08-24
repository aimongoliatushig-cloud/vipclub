export type MainTab = "home" | "requests" | "schedule" | "earnings" | "profile";

export type ShiftStatus =
  | "Боломжтой"
  | "Тайзан дээр"
  | "VIP үйлчилгээ"
  | "Завсарлага"
  | "Ээлж дууссан";

export type AppView =
  | MainTab
  | "loan"
  | "attendance"
  | "attendance-day"
  | "service-request"
  | "request-detail"
  | "active-service"
  | "completion"
  | "transaction-detail"
  | "shift-detail"
  | "rank"
  | "settings"
  | "notifications"
  | "team"
  | "team-exception"
  | "adjustment";

export type RequestState = "new" | "accepted" | "declined" | "completed";

export type LoanRequest = {
  amount: number;
  repaymentRate: number;
  purpose: string;
  requestedAt: string;
  status: "Шийдвэр хүлээж байна";
};

export const loanPolicy = {
  maximumAmount: 1_200_000,
  outstandingBalance: 0,
  amountStep: 50_000,
  repaymentRates: [10, 15, 20, 25, 30],
} as const;

export type Transaction = {
  id: string;
  type: string;
  amount: number;
  date: string;
  time: string;
  branch: string;
  reference: string;
  gross: number;
  share: number;
  adjustment: number;
  status: "Баталгаажсан" | "Хүлээгдэж байна" | "Олгосон";
};

export type Shift = {
  id: string;
  weekday: string;
  date: string;
  branch: string;
  start: string;
  end: string;
  status: "Баталгаажсан" | "Хүсэлт илгээсэн";
};

export type TeamMember = {
  name: string;
  status: "Боломжтой" | "Тайзан дээр" | "VIP үйлчилгээ" | "Завсарлага" | "Ирээгүй";
  detail: string;
  timer?: string;
};

export type AttendanceStatus = "Хэвийн" | "Хоцорсон" | "Тасалсан" | "Зөвшөөрсөн чөлөө";

export type AttendanceRecord = {
  id: string;
  date: string;
  weekday: string;
  branch: string;
  scheduled: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  variance: string;
  rankImpact: string;
};

export type DeductionRecord = {
  id: string;
  title: string;
  amount: number;
  date: string;
  branch: string;
  reason: string;
  status: "Баталгаажсан" | "Хүлээгдэж байна";
  source: string;
};

export const statusOptions: ShiftStatus[] = [
  "Боломжтой",
  "Тайзан дээр",
  "VIP үйлчилгээ",
  "Завсарлага",
  "Ээлж дууссан",
];

export const earningsByPeriod = {
  day: {
    label: "Өдөр",
    amount: 487_500,
    deductions: 32_500,
    gross: 520_000,
    labels: ["20", "21", "22", "23", "00", "01", "02"],
    values: [20, 54, 96, 168, 246, 402, 488],
    breakdown: { service: 360_000, tips: 100_000, commission: 60_000 },
  },
  week: {
    label: "7 хоног",
    amount: 1_286_500,
    deductions: 128_000,
    gross: 1_414_500,
    labels: ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"],
    values: [128, 182, 188, 268, 312, 278, 348],
    breakdown: { service: 1_030_000, tips: 226_500, commission: 158_000 },
  },
  month: {
    label: "Сар",
    amount: 4_840_000,
    deductions: 328_000,
    gross: 5_168_000,
    labels: ["1", "5", "10", "15", "20", "25", "30"],
    values: [420, 780, 1_360, 2_020, 2_940, 3_760, 4_840],
    breakdown: { service: 3_780_000, tips: 768_000, commission: 620_000 },
  },
} as const;

export type EarningsPeriod = keyof typeof earningsByPeriod;

// Prototype fixtures mirror DAILY_RANKING_CONTRACT.md. Production values come from the rank API.
export const rankSummary = {
  score: 84.6,
  countedDays: 24,
  currentRank: "2-р зэрэг",
  payoutPercent: 60,
  nextRank: "1-р зэрэг",
  nextThreshold: 90,
  missingScore: 5.4,
  latestDate: "8 сарын 23",
  latestDailyScore: 88.0,
} as const;

export const rankRules = [
  { label: "3-р зэрэг", scoreRange: "0–79.99 оноо", payoutPercent: 50, note: "Эхлэх болон хамгийн доод зэрэг" },
  { label: "2-р зэрэг", scoreRange: "80–89.99 оноо", payoutPercent: 60, note: "Одоогийн зэрэг" },
  { label: "1-р зэрэг", scoreRange: "90–100 оноо", payoutPercent: 70, note: "Дээд зэрэг" },
] as const;

export const rankFactors = [
  { label: "Ирц", score: 96, weight: 10, contribution: 9.6 },
  { label: "Зочны санал, гомдол", score: 92, weight: 15, contribution: 13.8 },
  { label: "Борлуулалт", score: 86, weight: 40, contribution: 34.4 },
  { label: "Үзвэр, бүжгийн ур чадвар", score: 88, weight: 5, contribution: 4.4 },
  { label: "Цэвэр байдал, төрх", score: 90, weight: 5, contribution: 4.5 },
  { label: "Өдрийн гараа", score: 78, weight: 10, contribution: 7.8 },
  { label: "Хувийн хөгжил", score: 82, weight: 5, contribution: 4.1 },
  { label: "Хандлага", score: 94, weight: 10, contribution: 9.4 },
] as const;

export const rankHistory = [
  { shortDate: "8/19", date: "8 сарын 19", score: 89.1, displayScore: "89.1", status: "Баталгаажсан", tone: "confirmed" },
  { shortDate: "8/20", date: "8 сарын 20", score: 0, displayScore: "0", status: "Тасалсан", tone: "missed" },
  { shortDate: "8/21", date: "8 сарын 21", score: 0, displayScore: "—", status: "Зөвшөөрсөн чөлөө", tone: "leave" },
  { shortDate: "8/22", date: "8 сарын 22", score: 82.8, displayScore: "82.8", status: "Баталгаажсан", tone: "confirmed" },
  { shortDate: "8/23", date: "8 сарын 23", score: 87.2, displayScore: "87.2", status: "Баталгаажсан", tone: "confirmed" },
] as const;

export const transactions: Transaction[] = [
  {
    id: "txn-vip-03",
    type: "VIP үйлчилгээ",
    amount: 240_000,
    date: "2026.08.24",
    time: "00:18",
    branch: "Nomad",
    reference: "VIP 03 · 2 цаг",
    gross: 400_000,
    share: 240_000,
    adjustment: 0,
    status: "Баталгаажсан",
  },
  {
    id: "txn-tip-01",
    type: "Tip",
    amount: 80_000,
    date: "2026.08.23",
    time: "23:42",
    branch: "Nomad",
    reference: "Төлбөрийн баримт 3841",
    gross: 80_000,
    share: 80_000,
    adjustment: 0,
    status: "Хүлээгдэж байна",
  },
  {
    id: "txn-commission-02",
    type: "Комисс",
    amount: 42_000,
    date: "2026.08.22",
    time: "01:06",
    branch: "Sapphire",
    reference: "POS борлуулалт 1028",
    gross: 420_000,
    share: 42_000,
    adjustment: 0,
    status: "Олгосон",
  },
];

export const shifts: Shift[] = [
  {
    id: "shift-aug-24",
    weekday: "Даваа",
    date: "8 сарын 24",
    branch: "Nomad",
    start: "21:00",
    end: "04:00",
    status: "Баталгаажсан",
  },
  {
    id: "shift-aug-26",
    weekday: "Лхагва",
    date: "8 сарын 26",
    branch: "Nomad",
    start: "21:00",
    end: "04:00",
    status: "Баталгаажсан",
  },
  {
    id: "shift-aug-28",
    weekday: "Баасан",
    date: "8 сарын 28",
    branch: "Sapphire",
    start: "22:00",
    end: "05:00",
    status: "Хүсэлт илгээсэн",
  },
];

export const attendanceRecords: AttendanceRecord[] = [
  {
    id: "attendance-aug-24",
    date: "8 сарын 24",
    weekday: "Өнөөдөр",
    branch: "Nomad",
    scheduled: "21:00–04:00",
    checkIn: "20:56",
    checkOut: "Ээлж үргэлжилж байна",
    status: "Хэвийн",
    variance: "4 минутын өмнө",
    rankImpact: "Өдөр дууссаны дараа 8 үзүүлэлтээр бодогдоно",
  },
  {
    id: "attendance-aug-23",
    date: "8 сарын 23",
    weekday: "Ням",
    branch: "Nomad",
    scheduled: "21:00–04:00",
    checkIn: "20:53",
    checkOut: "04:02",
    status: "Хэвийн",
    variance: "7 минутын өмнө",
    rankImpact: "Баталгаажсан өдөр · 87.2 оноо",
  },
  {
    id: "attendance-aug-22",
    date: "8 сарын 22",
    weekday: "Бямба",
    branch: "Sapphire",
    scheduled: "21:00–04:00",
    checkIn: "21:18",
    checkOut: "04:01",
    status: "Хоцорсон",
    variance: "18 минут хоцорсон",
    rankImpact: "Баталгаажсан өдөр · 82.8 оноо",
  },
  {
    id: "attendance-aug-21",
    date: "8 сарын 21",
    weekday: "Баасан",
    branch: "Nomad",
    scheduled: "21:00–04:00",
    checkIn: "—",
    checkOut: "—",
    status: "Зөвшөөрсөн чөлөө",
    variance: "Урьдчилан зөвшөөрсөн",
    rankImpact: "Дундаж оноонд орохгүй",
  },
  {
    id: "attendance-aug-20",
    date: "8 сарын 20",
    weekday: "Пүрэв",
    branch: "Nomad",
    scheduled: "21:00–04:00",
    checkIn: "—",
    checkOut: "—",
    status: "Тасалсан",
    variance: "Ирц бүртгэгдээгүй",
    rankImpact: "Баталгаажсан таслалт · 0 оноотой өдөр",
  },
  {
    id: "attendance-aug-19",
    date: "8 сарын 19",
    weekday: "Лхагва",
    branch: "Nomad",
    scheduled: "21:00–04:00",
    checkIn: "20:49",
    checkOut: "04:05",
    status: "Хэвийн",
    variance: "11 минутын өмнө",
    rankImpact: "Баталгаажсан өдөр · 89.1 оноо",
  },
];

export const deductionRecords: DeductionRecord[] = [
  {
    id: "deduction-service-fee",
    title: "Үйлчилгээний шимтгэл",
    amount: 260_000,
    date: "2026.08.01–24",
    branch: "Бүх салбар",
    reason: "Баталгаажсан үйлчилгээний дүрмийн дагуу",
    status: "Баталгаажсан",
    source: "Төлбөрийн баталгаажсан бүртгэл",
  },
  {
    id: "deduction-late",
    title: "Хоцролтын засвар",
    amount: 20_000,
    date: "2026.08.18",
    branch: "Nomad",
    reason: "Ээлжид 18 минут хоцорсон",
    status: "Баталгаажсан",
    source: "QR ирцийн баталгаажсан цаг",
  },
  {
    id: "deduction-advance",
    title: "Урьдчилгаа нөхөлт",
    amount: 48_000,
    date: "2026.08.20",
    branch: "Nomad",
    reason: "Өмнөх урьдчилгааны тохирсон эргэн төлөлт",
    status: "Баталгаажсан",
    source: "Төлбөрийн баталгаажсан хуваарь",
  },
];

export const teamMembers: TeamMember[] = [
  { name: "Ану", status: "Боломжтой", detail: "12 мин өмнө чөлөөлөгдсөн" },
  { name: "Сараа", status: "Боломжтой", detail: "Дараалалд бэлэн" },
  { name: "Номин", status: "Боломжтой", detail: "Дараалалд бэлэн" },
  { name: "Мишээл", status: "Боломжтой", detail: "5 мин өмнө чөлөөлөгдсөн" },
  { name: "Солонго", status: "Тайзан дээр", detail: "Үндсэн тайз", timer: "03:18" },
  { name: "Энжи", status: "Тайзан дээр", detail: "Lounge", timer: "01:42" },
  { name: "Уянга", status: "VIP үйлчилгээ", detail: "VIP 03", timer: "01:24 үлдсэн" },
  { name: "Марал", status: "VIP үйлчилгээ", detail: "VIP 07", timer: "00:38 үлдсэн" },
  { name: "Туяа", status: "VIP үйлчилгээ", detail: "VIP 02", timer: "00:52 үлдсэн" },
  { name: "Отгон", status: "Завсарлага", detail: "15:20 үлдсэн" },
  { name: "Болор", status: "Завсарлага", detail: "08:45 үлдсэн" },
  { name: "Нараа", status: "Ирээгүй", detail: "Ээлж 21:00-д эхэлсэн" },
];

export const rotation = [
  { order: "Одоо", name: "Солонго", detail: "Үндсэн тайз", timer: "03:18", state: "current" },
  { order: "Дараагийн", name: "Ану", detail: "8 минутын дараа", timer: "22:40", state: "next" },
  { order: "3", name: "Сараа", detail: "Дараалалд бэлэн", timer: "", state: "queued" },
  { order: "4", name: "Номин", detail: "Дараалалд бэлэн", timer: "", state: "queued" },
  { order: "Алгассан", name: "Мишээл", detail: "VIP хүсэлт хүлээж байна", timer: "", state: "skipped" },
] as const;

export function formatMoney(value: number) {
  return `₮${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
