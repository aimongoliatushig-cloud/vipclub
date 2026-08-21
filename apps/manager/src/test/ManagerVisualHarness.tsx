import React from "react";
import ReactDOM from "react-dom/client";
import LiveManagementApplication from "../app/LiveManagementApplication";
import type {
  AttendanceCorrectionRequest,
  FrappeManagementApi,
  HireEmployeeInput,
  LeaveRequest,
  ManagerTeamMember,
  PenaltyRow,
  ReadinessQueueRow,
} from "../services/managementApi";
import type { ManagementSession } from "../shared/managementAccess";
import "../styles.css";
import "../theme.css";
import { initializeTheme } from "../themeRuntime";

initializeTheme();

const augustStressQa = new URLSearchParams(window.location.search).has(
  "august-stress",
);
const augustDancerNames = [
  "Ginjin",
  "Irina",
  "jenny",
  "manduhai",
  "mona",
  "Olzii",
  "Sarnai",
  "tanhil",
  "Ариу",
  "Аяана",
  "Аялгуу",
  "Гоо",
  "Заяа",
  "Луна",
  "Нарка",
  "Саруул",
  "Сийлэн",
  "Сиси",
  "Соко",
  "Тэргэл",
  "Уярал",
  "Үжин",
  "Эгшиглэн",
];

const session: ManagementSession = {
  userId: "manager.visual@example.test",
  displayName: "Номин Менежер",
  initials: "НМ",
  role: "branch-manager",
  branchIds: ["Nomad"],
  permissions: [
    "branch.dashboard.read",
    "branch.workforce.write",
    "branch.crm.read",
    "branch.recommendations.write",
  ],
  source: "server",
};

let visualTeam: ManagerTeamMember[] = [
  {
    employee: "EMP-1",
    profile: "P-1",
    display_name: "Ану",
    role_label: "Бүжигчин",
    member_type: "Entertainer",
    rank: "Rank 1",
    status: "Active",
    modified: "2026-08-17 16:30:00",
    shift: { name: "SA-1", shift_type: "Оройн ээлж", start_date: "2026-08-17" },
    attendance: {
      work_date: "2026-08-17",
      state: "checked_in",
      checked_in: true,
      checked_out: false,
      arrival_time: "2026-08-17 21:52:00",
      departure_time: null,
      late_minutes: 0,
      late_after_time: "22:00:00",
      requires_checkout: false,
    },
  },
  {
    employee: "EMP-2",
    profile: null,
    display_name: "Бат",
    role_label: "Хамгаалагч",
    member_type: "Employee",
    rank: null,
    status: "Active",
    modified: "2026-08-17 16:31:00",
    shift: { name: "SA-2", shift_type: "Оройн ээлж", start_date: "2026-08-17" },
    attendance: {
      work_date: "2026-08-17",
      state: "not_arrived",
      checked_in: false,
      checked_out: false,
      arrival_time: null,
      departure_time: null,
      late_minutes: 0,
      late_after_time: "22:00:00",
      requires_checkout: true,
    },
  },
];

let visualLeaves: LeaveRequest[] = [
  {
    name: "EL-1",
    entertainer: "P-1",
    employee: "EMP-1",
    branch: "Nomad",
    display_name: "Ану",
    leave_date: "2026-08-20",
    to_date: "2026-08-20",
    status: "Pending",
    requested_at: "2026-08-17 15:10:00",
    reason: "Гэр бүлийн яаралтай ажил гарсан.",
    decision_reason: null,
    modified: "2026-08-17 15:10:00",
    source_type: "Emergency Leave",
  },
  {
    name: "LA-1",
    entertainer: "",
    employee: "EMP-2",
    branch: "Nomad",
    display_name: "Бат",
    leave_date: "2026-08-24",
    to_date: "2026-08-26",
    status: "Pending",
    requested_at: "2026-08-17 14:30:00",
    reason: "Урьдчилан төлөвлөсөн хувийн чөлөө.",
    decision_reason: null,
    modified: "2026-08-17 14:30:00",
    source_type: "Leave Application",
    leave_type: "Хувийн чөлөө",
  },
];

let visualCorrections: AttendanceCorrectionRequest[] = [
  {
    name: "AC-1",
    entertainer: "P-1",
    employee: "EMP-1",
    branch: "Nomad",
    display_name: "Ану",
    attendance_date: "2026-08-16",
    correction_type: "Check-in",
    requested_time: "2026-08-16 21:55:00",
    proposed_at: "2026-08-16 21:55:00",
    original_time: null,
    shift_start: "2026-08-16 22:00:00",
    shift_end: "2026-08-17 05:00:00",
    reason: "QR уншсан боловч сүлжээ тасарсан.",
    status: "Pending",
    penalties: [],
    review_blocked_reason: null,
    modified: "2026-08-17 13:00:00",
  },
];

let visualPenalties: PenaltyRow[] = [
  {
    name: "PN-1",
    entertainer: "P-1",
    employee: "EMP-1",
    display_name: "Ану",
    attendance_date: "2026-08-15",
    penalty_type: "Late",
    late_minutes: 18,
    amount: 9_000,
    status: "Approved",
    reason: "QR ирцээр 18 минут хоцорсон.",
    decision_reason:
      "10 минутаас дээш хоцролтыг дүрмийн дагуу автоматаар баталгаажуулав.",
    modified: "2026-08-17 13:20:00",
  },
];

let visualLatePolicy = {
  branch: "Nomad",
  late_after_time: "22:00:00",
  updated_by: "manager.visual@example.test",
  updated_at: "2026-08-17 12:00:00",
  modified: "2026-08-17 12:00:00",
};
let visualReadiness: ReadinessQueueRow[] = [
  {
    entertainer: "P-3",
    stage_name: "Нараа",
    employee: "EMP-3",
    branch: "Nomad",
    shift_assignment: "SA-3",
    shift_type: "Оройн ээлж",
    readiness_status: "PENDING",
    attendance: {
      checked_in: true,
      employee_checkin: "CHECK-3",
      checked_in_at: "2026-08-17 21:54:00",
    },
  },
  {
    entertainer: "P-5",
    stage_name: "Саруул",
    employee: "EMP-5",
    branch: "Nomad",
    shift_assignment: "SA-5",
    shift_type: "Оройн ээлж",
    readiness_status: "PENDING",
    attendance: {
      checked_in: true,
      employee_checkin: "CHECK-5",
      checked_in_at: "2026-08-17 21:57:00",
    },
  },
  {
    entertainer: "P-1",
    stage_name: "Ану",
    employee: "EMP-1",
    branch: "Nomad",
    shift_assignment: "SA-1",
    shift_type: "Оройн ээлж",
    readiness_status: "READY",
    readiness_check: "RC-1",
    readiness_modified: "2026-08-17 22:02:00",
    readiness_checked_at: "2026-08-17 22:02:00",
    readiness_supervisor: "lead@example.test",
    attendance: {
      checked_in: true,
      employee_checkin: "CHECK-1",
      checked_in_at: "2026-08-17 21:52:00",
    },
  },
];
if (augustStressQa) {
  visualReadiness = augustDancerNames.map((stageName, index) => {
    const readinessStatus =
      index < 11 ? "PENDING" : index < 19 ? "READY" : "NOT_READY";
    return {
      entertainer: `AUG-P-${index + 1}`,
      stage_name: stageName,
      employee: `AUG-EMP-${index + 1}`,
      branch: "Nomad",
      shift_assignment: `AUG-SA-${index + 1}`,
      shift_type: "VIP Night Shift",
      readiness_status: readinessStatus,
      ...(readinessStatus === "PENDING"
        ? {}
        : {
            readiness_check: `AUG-RC-${index + 1}`,
            readiness_modified: "2026-08-18 22:10:00",
            readiness_checked_at: "2026-08-18 22:10:00",
            readiness_supervisor: "lead@example.test",
          }),
      attendance: {
        checked_in: true,
        employee_checkin: `AUG-CHECK-${index + 1}`,
        checked_in_at: `2026-08-18 22:${String((index * 3) % 60).padStart(2, "0")}:00`,
      },
    } satisfies ReadinessQueueRow;
  });
}

const augustDashboardRoster = augustDancerNames.map((displayName, index) => ({
  profile: `AUG-P-${index + 1}`,
  display_name: displayName,
  rank: index < 3 ? "Rank 1" : index < 10 ? "Rank 2" : "Rank 3",
  current_points: Math.max(0, 96 - index * 3),
  status: "checked_in",
  work_date: "2026-08-18",
  shift: { shift_type: "VIP Night Shift" },
  readiness:
    index < 11
      ? null
      : {
          name: `AUG-RC-${index + 1}`,
          result: index < 19 ? "READY" : "NOT_READY",
          reason: index < 19 ? undefined : "QA: бэлтгэл дутуу",
          checked_at: "2026-08-18 22:10:00",
        },
  availability: { status: index < 19 ? "Available" : "Unavailable" },
}));
const augustRoundCounts = new Map(
  augustDancerNames.map((_, index) => [`AUG-P-${index + 1}`, index % 8]),
);
function visualRoundsPayload() {
  const people = augustStressQa
    ? augustDancerNames.map((displayName, index) => {
        const rounds = augustRoundCounts.get(`AUG-P-${index + 1}`) ?? 0;
        const missingRounds = Math.max(0, 7 - rounds);
        return {
          entertainer: `AUG-P-${index + 1}`,
          employee: `AUG-EMP-${index + 1}`,
          display_name: displayName,
          current_rank: index < 3 ? "Rank 1" : index < 10 ? "Rank 2" : "Rank 3",
          shift_assignment: `AUG-SA-${index + 1}`,
          shift_type: "VIP Night Shift",
          employee_checkin: `AUG-CHECK-${index + 1}`,
          checked_in_at: "2026-08-18 22:00:00",
          rounds,
          target: 7,
          completed: rounds === 7,
          missing_rounds: missingRounds,
          projected_penalty: missingRounds * 30_000,
        };
      })
    : [];
  return {
    branch: "Nomad",
    work_date: augustStressQa ? "2026-08-18" : "2026-08-17",
    target: 7,
    penalty_rate: 30_000,
    people,
    summary: {
      checked_in: people.length,
      completed: people.filter((person) => person.completed).length,
      incomplete: people.filter((person) => !person.completed).length,
      remaining_rounds: people.reduce(
        (sum, person) => sum + person.missing_rounds,
        0,
      ),
      projected_penalty: people.reduce(
        (sum, person) => sum + person.projected_penalty,
        0,
      ),
    },
    access: { can_submit: true, message: "Зөвхөн QR ирцтэй бүжигчид." },
  };
}
const visualAssignments = new Map<
  string,
  {
    name: string;
    shift_type: string;
    start_date: string;
    end_date: string;
    status: string;
    modified: string;
  }
>();
visualAssignments.set("P-1:2026-08-17", {
  name: "SA-1",
  shift_type: "Оройн ээлж",
  start_date: "2026-08-17",
  end_date: "2026-08-17",
  status: "Active",
  modified: "2026-08-17 12:00:00",
});
const visualRankOverrides = new Map<string, Record<string, number>>();
const visualRankAudit: Array<{
  name: string;
  profile: string;
  component: string;
  score: number;
  previous_score: number | null;
  reason: string;
  severity?: string;
  scoring_date: string;
  occurred_at: string;
}> = [];

const demoComponentConfig = [
  ["attendance", "Ирц", 10],
  ["customer_complaints", "Үйлчлүүлэгчийн гомдол", 15],
  ["sales", "Борлуулалт", 40],
  ["entertaining_skill", "Үзвэрийн ур чадвар", 5],
  ["cleanliness_beauty", "Цэвэр байдал, төрх", 5],
  ["shift_effort", "Өдрийн гараа", 10],
  ["personal_development", "Хувийн хөгжил", 5],
  ["entertainer_attitude", "Ажлын хандлага", 10],
] as const;
const visualDemoResults = augustDancerNames.map((displayName, index) => {
  const attendanceState =
    index % 11 === 0 ? "Absent" : index % 5 === 0 ? "Late" : "Present";
  const rounds = 3 + (index % 5);
  const scores = [
    attendanceState === "Absent" ? 0 : attendanceState === "Late" ? 72 : 100,
    72 + (index % 29),
    58 + (index % 43),
    70 + (index % 28),
    68 + (index % 30),
    (rounds / 7) * 100,
    65 + (index % 31),
    66 + (index % 32),
  ];
  const components = demoComponentConfig.map(
    ([component, label, weight], componentIndex) => ({
      component,
      label,
      score: scores[componentIndex],
      weight,
      contribution: (scores[componentIndex] * weight) / 100,
      status: "verified" as const,
      provenance: "DEMO" as const,
    }),
  );
  const weightedScore = components.reduce(
    (sum, component) => sum + component.contribution,
    0,
  );
  const calculatedRank =
    weightedScore >= 90
      ? "Rank 1"
      : weightedScore >= 80
        ? "Rank 2"
        : "Rank 3";
  const attention = [
    ...(attendanceState === "Absent"
      ? ["Demo таслалт: тухайн өдрийн ирцийн оноо 0 болсон"]
      : attendanceState === "Late"
        ? ["Demo хоцролт: 14 минут"]
        : []),
    ...(rounds < 7
      ? [`Demo гараа: ${rounds}/7, ${7 - rounds} гараа дутуу`]
      : []),
  ];
  return {
    profile: `AUG-P-${index + 1}`,
    employee: `AUG-EMP-${index + 1}`,
    display_name: displayName,
    branch: "Nomad",
    identity_provenance: "VERIFIED_EMPLOYEE_MASTER" as const,
    input_provenance: "DEMO" as const,
    approved_rank: "Rank 3",
    calculated_rank: calculatedRank,
    change_state:
      calculatedRank === "Rank 3"
        ? ("No Change" as const)
        : ("Demo Difference" as const),
    status: "Complete" as const,
    weighted_score: weightedScore,
    displayed_score: Math.round(weightedScore * 100) / 100,
    attendance_state: attendanceState,
    late_minutes: attendanceState === "Late" ? 14 : 0,
    readiness_result:
      index % 7 === 0 ? ("Not Ready" as const) : ("Ready" as const),
    rounds_completed: rounds,
    rounds_target: 7,
    demo_sales_amount: 500_000 + index * 110_000,
    components,
    attention,
    scoring_date: "2026-08-19",
  };
});
const visualDemoSummary = {
  profile_count: visualDemoResults.length,
  complete_count: visualDemoResults.length,
  attention_count: visualDemoResults.filter((row) => row.attention.length)
    .length,
  average_score:
    visualDemoResults.reduce((sum, row) => sum + row.weighted_score, 0) /
    visualDemoResults.length,
  demo_sales_total: visualDemoResults.reduce(
    (sum, row) => sum + row.demo_sales_amount,
    0,
  ),
  rank_counts: visualDemoResults.reduce<Record<string, number>>(
    (counts, row) => ({
      ...counts,
      [row.calculated_rank]: (counts[row.calculated_rank] ?? 0) + 1,
    }),
    {},
  ),
  branch_counts: { Nomad: visualDemoResults.length },
};

const visualSalesValues = [
  10, 12, 8, 15, 11, 14, 9, 13, 12, 16, 10, 11, 14, 9, 13, 12, 8, 17,
].map((value) => value * 1_000_000);
const visualSalesDaily = visualSalesValues.map((netSales, index) => ({
  date: `2026-08-${String(index + 1).padStart(2, "0")}`,
  net_sales: netSales,
  gross_sales: netSales + (index === 7 ? 600_000 : 0),
  bill_count: 4 + (index % 5),
  refund_count: index === 7 ? 1 : 0,
}));
const visualRecentBills = [
  {
    name: "VIS-BILL-1842",
    bill_code: "1842",
    posting_date: "2026-08-18",
    open_date: "2026-08-18 22:14:00",
    closed_date: "2026-08-18 23:42:00",
    store_name: "Nomad",
    bill_type: 1,
    total_amount: 6_800_000,
    items: [
      { name: "VIP өрөө", quantity: 1, total: 3_200_000 },
      {
        name: "Бүжигчний үйлчилгээ",
        quantity: 6,
        total: 2_400_000,
        dancers: [
          { name: "Ану", amount: 720_000, sales_amount: 1_200_000 },
          { name: "Нараа", amount: 720_000, sales_amount: 1_200_000 },
        ],
      },
      { name: "Ундаа", quantity: 8, total: 1_200_000 },
    ],
  },
  {
    name: "VIS-BILL-1839",
    bill_code: "1839",
    posting_date: "2026-08-18",
    open_date: "2026-08-18 21:06:00",
    closed_date: "2026-08-18 22:48:00",
    store_name: "Nomad",
    bill_type: 1,
    total_amount: 5_200_000,
    items: [
      { name: "VIP өрөө", quantity: 1, total: 2_600_000 },
      { name: "Бүжигчний үйлчилгээ", quantity: 4, total: 1_600_000 },
      { name: "Ундаа", quantity: 6, total: 1_000_000 },
    ],
  },
  {
    name: "VIS-BILL-1834",
    bill_code: "1834",
    posting_date: "2026-08-18",
    open_date: "2026-08-18 20:18:00",
    closed_date: "2026-08-18 21:30:00",
    store_name: "Nomad",
    bill_type: 1,
    total_amount: 3_100_000,
    items: [
      { name: "Бүжигчний үйлчилгээ", quantity: 4, total: 1_600_000 },
      { name: "Ундаа", quantity: 9, total: 1_500_000 },
    ],
  },
  {
    name: "VIS-BILL-1827",
    bill_code: "1827",
    posting_date: "2026-08-18",
    open_date: "2026-08-18 19:42:00",
    closed_date: "2026-08-18 20:26:00",
    store_name: "Nomad",
    bill_type: 1,
    total_amount: 1_900_000,
    items: [
      { name: "Ундаа", quantity: 7, total: 1_100_000 },
      { name: "Хоол", quantity: 3, total: 800_000 },
    ],
  },
];
const visualTopItems = [
  {
    name: "Бүжигчний үйлчилгээ",
    quantity: 128,
    net_sales: 82_000_000,
    bill_count: 54,
  },
  { name: "VIP өрөө", quantity: 31, net_sales: 61_000_000, bill_count: 29 },
  { name: "Ундаа", quantity: 346, net_sales: 48_000_000, bill_count: 71 },
  { name: "Хоол", quantity: 112, net_sales: 23_000_000, bill_count: 38 },
];
const buildVisualSalesPeriod = (
  startIndex: number,
  endIndex: number,
  previousNetSales: number,
) => {
  const dailySales = visualSalesDaily.slice(startIndex, endIndex + 1);
  const netSales = dailySales.reduce((sum, row) => sum + row.net_sales, 0);
  const grossSales = dailySales.reduce((sum, row) => sum + row.gross_sales, 0);
  const billCount = dailySales.reduce((sum, row) => sum + row.bill_count, 0);
  const scale = netSales / 214_000_000;
  return {
    start_date: dailySales[0].date,
    end_date: dailySales[dailySales.length - 1].date,
    net_sales: netSales,
    gross_sales: grossSales,
    bill_count: billCount,
    refund_count: dailySales.reduce((sum, row) => sum + row.refund_count, 0),
    refund_amount: grossSales - netSales,
    average_bill: grossSales / billCount,
    previous_net_sales: previousNetSales,
    change_percent: ((netSales - previousNetSales) / previousNetSales) * 100,
    daily_sales: dailySales,
    categories: visualTopItems.map((row) => ({
      ...row,
      quantity: row.quantity * scale,
      net_sales: row.net_sales * scale,
    })),
    category_detail_coverage: 100,
    top_items: visualTopItems.map((row) => ({
      ...row,
      quantity: row.quantity * scale,
      net_sales: row.net_sales * scale,
    })),
    people: [
      {
        name: "Ану",
        sales_amount: 24_800_000 * scale,
        employee_amount: 12_400_000 * scale,
        service_count: 18,
        bill_count: 11,
      },
      {
        name: "Нараа",
        sales_amount: 19_600_000 * scale,
        employee_amount: 9_800_000 * scale,
        service_count: 15,
        bill_count: 9,
      },
      {
        name: "Сондор",
        sales_amount: 14_200_000 * scale,
        employee_amount: 7_100_000 * scale,
        service_count: 12,
        bill_count: 7,
      },
    ],
    recent_bills: visualRecentBills,
    bill_total: visualRecentBills.length,
    item_detail_coverage: 100,
  };
};

const api = {
  getDemoRankReport: async () => ({
    batch: {
      batch_id: "production-demo-2026-08-19-v1",
      scoring_date: "2026-08-19",
      status: "Active" as const,
      policy_version: "DAILY-8-FACTOR-V1",
      created_by: "Administrator",
      created_at: "2026-08-19 00:45:00",
      notes: "Visual QA demo",
    },
    summary: visualDemoSummary,
    results: visualDemoResults,
    data_contract: {
      identity: "VERIFIED_EMPLOYEE_MASTER" as const,
      inputs: "DEMO" as const,
      mutates_approved_rank: false as const,
      mutates_attendance_or_payroll: false as const,
    },
  }),
  getSalesProgress: async () => ({
    branch: "Nomad",
    month: "2026-08",
    active_goal: {
      name: "G-1",
      goal_month: "2026-08-01",
      state: "Active",
      version: 1,
      approved_target: 320_000_000,
      modified: "2026-08-17",
    },
    actual_sales: 214_000_000,
    achievement_percent: 67,
    remaining_amount: 106_000_000,
    periods: {
      yesterday: buildVisualSalesPeriod(17, 17, 13_000_000),
      week: buildVisualSalesPeriod(16, 17, 22_000_000),
      month: buildVisualSalesPeriod(0, 17, 186_000_000),
    },
    latest_paid_bill_date: "2026-08-18",
    latest_synced_at: "2026-08-18 22:15:00",
    actual_source: "VIP POS Bill",
    metric_definition:
      "Төлөгдсөн баримт; буцаалтыг хассан цэвэр борлуулалт; огноо нь posting_date.",
    generated_at: "2026-08-18 22:15:00",
  }),
  getManagerDashboard: async () => ({
    branch: "Nomad",
    date: augustStressQa ? "2026-08-18" : "2026-08-17",
    generated_at: "2026-08-18 22:15:00",
    summary: {
      total: augustStressQa ? 23 : 24,
      scheduled: augustStressQa ? 23 : 18,
      on_shift: augustStressQa ? 23 : 14,
      checked_in: augustStressQa ? 23 : 14,
      available: augustStressQa ? 8 : 6,
      reserved: 3,
      working: 4,
      break: 1,
      late: 1,
      absent: 0,
      leave: 2,
      off: 6,
      pending_readiness: augustStressQa ? 11 : 3,
      pending_leave: 2,
      pending_corrections: 1,
      pending_profile_changes: 0,
    },
    roster: augustStressQa
      ? augustDashboardRoster
      : [
          {
            profile: "P-1",
            display_name: "Ану",
            rank: "Rank 1",
            status: "checked_in",
            work_date: "2026-08-17",
            shift: { shift_type: "Оройн ээлж" },
            readiness: {
              name: "RC-1",
              result: "READY",
              checked_at: "2026-08-17 20:15:00",
            },
            availability: { status: "Available" },
          },
          {
            profile: "P-2",
            display_name: "Сондор",
            rank: "Rank 2",
            status: "checked_in",
            work_date: "2026-08-17",
            shift: { shift_type: "Оройн ээлж" },
            readiness: {
              name: "RC-2",
              result: "NOT_READY",
              reason: "Ажлын бэлтгэл хангалтгүй",
              checked_at: "2026-08-17 20:18:00",
            },
            availability: { status: "Unavailable" },
          },
          {
            profile: "P-3",
            display_name: "Нараа",
            rank: "Rank 1",
            status: "scheduled",
            work_date: "2026-08-17",
            shift: { shift_type: "Оройн ээлж" },
            readiness: null,
            availability: { status: "Unavailable" },
          },
          {
            profile: "P-4",
            display_name: "Мишээл",
            rank: "Rank 1",
            status: "off",
            work_date: "2026-08-17",
            shift: null,
            readiness: null,
            availability: { status: "Unavailable" },
          },
        ],
    meta: { total: augustStressQa ? 23 : 24 },
  }),
  getReadinessQueue: async (
    status: "All" | "Pending" | "Ready" | "Not_Ready" = "All",
  ) => {
    const normalized = status.toUpperCase();
    const queue =
      normalized === "ALL"
        ? visualReadiness
        : visualReadiness.filter((row) => row.readiness_status === normalized);
    return {
      branch: "Nomad",
      work_date: "2026-08-17",
      status: normalized,
      queue,
      summary: {
        total: visualReadiness.length,
        pending: visualReadiness.filter(
          (row) => row.readiness_status === "PENDING",
        ).length,
        ready: visualReadiness.filter((row) => row.readiness_status === "READY")
          .length,
        not_ready: visualReadiness.filter(
          (row) => row.readiness_status === "NOT_READY",
        ).length,
      },
      access: {
        can_submit: true,
        mode: "manager_fallback",
        lead_state: "off",
        lead_name: "Ахлах",
        message: "Ахлах бүжигчин өнөөдөр амарсан тул менежер шалгана.",
      },
      meta: { total: queue.length },
    };
  },
  submitReadiness: async (input: {
    shift_assignment: string;
    result: "READY" | "NOT_READY";
  }) => {
    visualReadiness = visualReadiness.map((row) =>
      row.shift_assignment === input.shift_assignment
        ? {
            ...row,
            readiness_status: input.result,
            readiness_check: `RC-${row.entertainer}`,
            readiness_modified: "2026-08-17 22:10:00",
            readiness_checked_at: "2026-08-17 22:10:00",
            readiness_supervisor: session.userId,
          }
        : row,
    );
    return { ok: true };
  },
  getDailyRounds: async () => visualRoundsPayload(),
  recordDailyRound: async (entertainer: string) => {
    augustRoundCounts.set(
      entertainer,
      Math.min(7, (augustRoundCounts.get(entertainer) ?? 0) + 1),
    );
    return visualRoundsPayload();
  },
  getManagerTeam: async () => ({
    branch: "Nomad",
    date: "2026-08-17",
    members: visualTeam.filter((member) => member.status === "Active"),
    meta: {
      total: visualTeam.filter((member) => member.status === "Active").length,
      entertainer_total: visualTeam.filter(
        (member) =>
          member.status === "Active" && member.member_type === "Entertainer",
      ).length,
    },
  }),
  getEmployeeLifecycleOptions: async () => ({
    branch: "Nomad",
    branches: ["Nomad"],
    companies: ["Nomad VIP Club LLC"],
    designations: ["Бүжигчин", "Хамгаалагч", "Зөөгч", "Бармен", "Үйлчлэгч"],
    departments: ["Үйлчилгээ", "Хамгаалалт", "Бар"],
    genders: ["Эмэгтэй", "Эрэгтэй", "Бусад"],
    today: "2026-08-17",
  }),
  hireEmployee: async (input: HireEmployeeInput) => {
    const employee = `EMP-${visualTeam.length + 1}`;
    const displayName = [input.lastName?.trim(), input.firstName.trim()]
      .filter(Boolean)
      .join(" ");
    visualTeam = [
      ...visualTeam,
      {
        employee,
        profile: null,
        display_name: displayName,
        role_label: input.designation,
        member_type: "Employee",
        rank: null,
        status: "Active",
        modified: "2026-08-17 17:20:00",
        shift: null,
        attendance: {
          work_date: "2026-08-17",
          state: "not_arrived",
          checked_in: false,
          checked_out: false,
          arrival_time: null,
          departure_time: null,
          late_minutes: 0,
          late_after_time: "22:00:00",
          requires_checkout: true,
        },
      },
    ];
    return {
      employee: {
        name: employee,
        employee_name: displayName,
        designation: input.designation,
        department: input.department ?? null,
        company: input.company,
        branch: input.branch,
        status: "Active",
        date_of_joining: input.dateOfJoining,
        relieving_date: null,
        modified: "2026-08-17 17:20:00",
      },
      replayed: false,
    };
  },
  terminateEmployee: async (employeeName: string, relievingDate: string) => {
    const current = visualTeam.find(
      (member) => member.employee === employeeName,
    );
    if (!current) throw new Error("Ажилтан олдсонгүй.");
    visualTeam = visualTeam.map((member) =>
      member.employee === employeeName
        ? { ...member, status: "Inactive", modified: "2026-08-17 17:25:00" }
        : member,
    );
    return {
      employee: {
        name: current.employee,
        employee_name: current.display_name,
        designation: current.role_label,
        department: null,
        company: "Nomad VIP Club LLC",
        branch: "Nomad",
        status: "Inactive",
        date_of_joining: null,
        relieving_date: relievingDate,
        modified: "2026-08-17 17:25:00",
      },
      replayed: false,
    };
  },
  getLeaveRequests: async () => ({
    requests: visualLeaves,
    meta: { total: visualLeaves.length },
  }),
  decideLeave: async (
    requestName: string,
    decision: "Approved" | "Rejected",
    reason: string,
  ) => {
    visualLeaves = visualLeaves.map((item) =>
      item.name === requestName
        ? {
            ...item,
            status: decision,
            decision_reason: reason || null,
            modified: "2026-08-17 17:30:00",
          }
        : item,
    );
    return { name: requestName, status: decision, replayed: false };
  },
  getPenalties: async () => ({
    branch: "Nomad",
    penalties: visualPenalties,
    meta: { total: visualPenalties.length },
  }),
  decidePenalty: async (
    name: string,
    decision: "Approved" | "Rejected",
    reason: string,
  ) => {
    visualPenalties = visualPenalties.map((item) =>
      item.name === name
        ? {
            ...item,
            status: decision,
            decision_reason: reason,
            modified: "2026-08-17 17:32:00",
          }
        : item,
    );
    return { name, status: decision };
  },
  reversePenalty: async (name: string, reason: string) => {
    visualPenalties = visualPenalties.map((item) =>
      item.name === name
        ? {
            ...item,
            status: "Reversed",
            decision_reason: reason,
            modified: "2026-08-17 17:33:00",
          }
        : item,
    );
    return { name, status: "Reversed" };
  },
  getAttendanceCorrections: async () => ({
    branch: "Nomad",
    requests: visualCorrections,
  }),
  decideAttendanceCorrection: async (
    name: string,
    decision: "Approved" | "Rejected",
  ) => {
    visualCorrections = visualCorrections.map((item) =>
      item.name === name
        ? { ...item, status: decision, modified: "2026-08-17 17:31:00" }
        : item,
    );
    return { name, status: decision, replayed: false };
  },
  getBranchAttendancePolicy: async () => visualLatePolicy,
  updateBranchLateTime: async (lateAfterTime: string) => {
    visualLatePolicy = {
      ...visualLatePolicy,
      late_after_time: `${lateAfterTime}:00`,
      updated_at: "2026-08-17 17:34:00",
      modified: "2026-08-17 17:34:00",
    };
    return visualLatePolicy;
  },
  getSchedule: async (startDate: string, days: number) => {
    const dates = Array.from({ length: days }, (_, index) => {
      const date = new Date(`${startDate}T12:00:00`);
      date.setDate(date.getDate() + index);
      return date.toISOString().slice(0, 10);
    });
    return {
      branch: "Nomad",
      window: { from: dates[0], to: dates.at(-1) ?? dates[0] },
      dates,
      shift_types: [
        { name: "Оройн ээлж", start_time: "22:00:00", end_time: "05:00:00" },
        { name: "Эрт ээлж", start_time: "20:00:00", end_time: "03:00:00" },
      ],
      people: [
        {
          profile: "P-1",
          employee: "EMP-1",
          display_name: "Ану",
          role_label: "Бүжигчин",
          member_type: "Entertainer" as const,
          rank: "Rank 1",
          days: dates.map((date) => ({
            date,
            assignment: visualAssignments.get(`P-1:${date}`) ?? null,
            imported: null,
            schedule_conflict: false,
            editable: date >= "2026-08-17",
          })),
        },
      ],
      source_meta: {
        authoritative: "Manager Entry",
        entertainer_count: 1,
        employee_count: 0,
      },
      generated_at: "2026-08-17 17:00:00",
    };
  },
  setSchedule: async (input: {
    profileName: string;
    workDate: string;
    shiftType: string;
  }) => {
    const key = `${input.profileName}:${input.workDate}`;
    if (input.shiftType)
      visualAssignments.set(key, {
        name: `SA-${visualAssignments.size + 1}`,
        shift_type: input.shiftType,
        start_date: input.workDate,
        end_date: input.workDate,
        status: "Active",
        modified: "2026-08-17 17:35:00",
      });
    else visualAssignments.delete(key);
    return {
      profile: input.profileName,
      date: input.workDate,
      assignment: visualAssignments.get(key) ?? null,
      replayed: false,
    };
  },
  getManagerEntertainerDetail: async (profileName: string) => {
    const isPrimaryFixture = profileName === "P-1";
    const matchedIndex = augustDancerNames.findIndex(
      (_, dancerIndex) => profileName === `AUG-P-${dancerIndex + 1}`,
    );
    const index = matchedIndex >= 0 ? matchedIndex : 0;
    const stageName = isPrimaryFixture
      ? "Ану"
      : (augustDancerNames[index] ?? "Ану");
    const rank = index < 3 ? "Rank 1" : index < 10 ? "Rank 2" : "Rank 3";
    const sales =
      [
        1_580_000, 0, 0, 1_630_000, 580_000, 0, 0, 0, 1_980_000, 0, 2_351_000,
        630_000, 0, 0, 0, 3_083_000, 1_010_000, 5_905_000, 0, 230_000, 630_000,
        9_408_000, 0,
      ][index] ?? 0;
    const linkedToFinex = [
      0, 3, 4, 8, 9, 10, 11, 15, 16, 17, 19, 20, 21,
    ].includes(index);
    const baseScores: Record<string, number> = {
      sales: 82,
      attendance: 95,
      customer_complaints: 90,
      shift_effort: 86,
      entertaining_skill: 80,
      cleanliness_beauty: 85,
      personal_development: 75,
      entertainer_attitude: 95,
    };
    const scores = { ...baseScores, ...visualRankOverrides.get(profileName) };
    const weights: Record<string, number> = {
      sales: 40,
      attendance: 10,
      customer_complaints: 15,
      shift_effort: 10,
      entertaining_skill: 5,
      cleanliness_beauty: 5,
      personal_development: 5,
      entertainer_attitude: 10,
    };
    const components = Object.keys(weights).map((component) => ({
      component,
      score: scores[component],
      weight: weights[component],
      contribution: (scores[component] * weights[component]) / 100,
      status: "verified" as const,
      source: {
        mode: ["sales", "attendance", "shift_effort"].includes(component)
          ? "automatic"
          : "manager_assessment",
      },
    }));
    const weightedScore = components.reduce(
      (total, component) => total + component.contribution,
      0,
    );
    const calculatedRank =
      weightedScore >= 90
        ? "Rank 1"
        : weightedScore >= 80
          ? "Rank 2"
          : "Rank 3";
    return {
      profile: {
        name: profileName,
        employee: isPrimaryFixture ? "EMP-1" : `AUG-EMP-${index + 1}`,
        employee_name: stageName,
        stage_name: stageName,
        branch: "Nomad",
        lifecycle_status: "Active",
        current_rank: rank,
        current_points: Math.max(0, 96 - index * 3),
        modified: "2026-08-18 22:15:00",
      },
      performance: linkedToFinex
        ? {
            window: { from: "2026-08-01", to: "2026-08-18" },
            current_month_income: sales,
            net_income: sales,
            points: Math.max(0, 96 - index * 3),
            service_count: Math.max(0, 23 - index),
            bill_count: Math.max(0, 9 - Math.floor(index / 3)),
            lifetime: {
              window: { from: "2026-08-01", to: "2026-08-18" },
              total_income: sales,
              active_months: 1,
              service_count: Math.max(0, 23 - index),
              bill_count: Math.max(0, 9 - Math.floor(index / 3)),
              months: [
                {
                  month: "2026-08",
                  income: sales,
                  services: Math.max(0, 23 - index),
                  bills: Math.max(0, 9 - Math.floor(index / 3)),
                },
              ],
            },
            recent_services: sales
              ? [
                  {
                    key: `AUG-SVC-${index + 1}`,
                    date: "2026-08-17",
                    service: "Үйлчилгээ",
                    amount: sales,
                    percent: 40,
                  },
                ]
              : [],
            rank: { current: { name: rank }, remaining_points: 0 },
          }
        : null,
      week: {
        start: "2026-08-17",
        end: "2026-08-23",
        days: Array.from({ length: 7 }, (_, dayIndex) => ({
          date: `2026-08-${String(17 + dayIndex).padStart(2, "0")}`,
          shift_type: dayIndex < 5 ? "VIP Night Shift" : null,
          start_time: dayIndex < 5 ? "22:00:00" : null,
          end_time: dayIndex < 5 ? "04:00:00" : null,
        })),
      },
      attendance: [
        {
          name: `AUG-CHECK-${index + 1}`,
          time: "2026-08-18 22:00:00",
          log_type: "IN" as const,
          shift: "VIP Night Shift",
        },
      ],
      summary: {
        scheduled_days: 13,
        attendance_events: 13,
        late_minutes: index % 4 === 0 ? 8 : 0,
        active_deduction: index % 4 === 0 ? 4_000 : 0,
      },
      manager_controls: {
        daily_rank: {
          name: `AUG-RANK-${index + 1}`,
          revision: 2,
          scoring_date: "2026-08-18",
          status: "Complete",
          weighted_score: weightedScore,
          displayed_score: Math.round(weightedScore * 100) / 100,
          calculated_rank: calculatedRank,
          approved_rank: rank,
          change_state:
            calculatedRank === rank ? "No Change" : "Recommended Change",
          missing_components: [],
          components,
        },
        component_audit: visualRankAudit.filter(
          (item) => item.profile === profileName,
        ),
      },
      meta: {
        profile_version: "2026-08-18 22:15:00",
        generated_at: "2026-08-18 22:15:00",
        api_version: "august-stress-qa",
      },
    };
  },
  submitDailyRankComponent: async (
    profileName: string,
    component: string,
    score: number,
    _scoringDate: string,
    reason: string,
    _requestKey: string,
    severity?: string,
  ) => {
    const existing = visualRankOverrides.get(profileName) ?? {};
    const previousScore =
      existing[component] ??
      (
        {
          customer_complaints: 90,
          entertaining_skill: 80,
          cleanliness_beauty: 85,
          personal_development: 75,
          entertainer_attitude: 95,
        } as Record<string, number>
      )[component] ??
      null;
    visualRankOverrides.set(profileName, { ...existing, [component]: score });
    visualRankAudit.unshift({
      name: `VISUAL-EVT-${visualRankAudit.length + 1}`,
      profile: profileName,
      component,
      score,
      previous_score: previousScore,
      reason,
      severity,
      scoring_date: "2026-08-18",
      occurred_at: "2026-08-19 01:15:00",
    });
    return { event: visualRankAudit[0].name, idempotent_replay: false };
  },
  getCustomers: async () => ({
    branch: "Nomad",
    customers: [
      {
        name: "C-1",
        customer_name: "Болд",
        phone: "•••• 1122",
        membership_rank: "Gold",
        visit_count: 8,
        bill_count: 6,
        total_spend: 8_400_000,
        average_bill: 1_400_000,
        last_visit: "2026-08-15",
        is_banned: 0,
        ban_reason: "",
        service_characteristics: "Тайван орчин, хийжүүлээгүй ус илүүд үздэг.",
      },
      {
        name: "C-2",
        customer_name: "Саруул",
        phone: "•••• 2233",
        membership_rank: "Silver",
        visit_count: 3,
        bill_count: 3,
        total_spend: 3_200_000,
        average_bill: 1_066_667,
        last_visit: "2026-08-14",
        is_banned: 1,
        ban_reason: "Үйлчилгээний ажилтанд бүдүүлэг харьцсан.",
        service_characteristics: "Булангийн нам гүм ширээ сонгодог.",
      },
    ],
    meta: { total: 2 },
  }),
  getEntryFeed: async () => ({
    branch: "Nomad",
    work_date: "2026-08-17",
    window_start: "2026-08-17 12:00:00",
    window_end: "2026-08-18 12:00:00",
    entries: [
      {
        name: "E-1",
        customer: "C-1",
        customer_name: "Болд",
        membership_rank: "Gold",
        guard_user: "guard@example.test",
        guard_name: "Номин хамгаалагч",
        entered_at: "2026-08-17 20:10:00",
        visit_type: "Returning",
        visit_number: 8,
        manager_acknowledged: 0,
      },
    ],
    reservations: [
      {
        name: "R-1",
        customer: "C-2",
        customer_name: "Саруул",
        phone: "•••• 2233",
        expected_at: "2026-08-17 21:30:00",
        party_size: 4,
        notes: "Төрсөн өдөр",
        order_items: [],
        status: "Scheduled",
        is_banned: 0,
        ban_reason: "",
      },
    ],
    pending_reservations: 1,
    today_total: 1,
    today_new: 0,
    unread: 1,
  }),
  getEntrySummary: async () => ({
    entry: {
      name: "E-1",
      customer: "C-1",
      customer_name: "Болд",
      entered_at: "2026-08-17 20:10:00",
      visit_number: 8,
      guard_name: "Номин хамгаалагч",
    },
    phone: "•••• 1122",
    visit_count: 8,
    membership_rank: "Gold",
    average_bill: 1_400_000,
    entertainers: [],
    top_entertainer: null,
  }),
  getReservationSummary: async () => ({
    reservation: {
      name: "R-1",
      customer: "C-2",
      customer_name: "Саруул",
      expected_at: "2026-08-17 21:30:00",
      party_size: 4,
      status: "Scheduled",
      notes: "Төрсөн өдөр",
      order_items: [],
    },
    phone: "•••• 2233",
    visit_count: 3,
    membership_rank: "Silver",
    average_bill: 1_066_667,
    is_banned: 0,
    ban_reason: "",
    entertainers: [],
    top_entertainer: null,
  }),
  setCustomerBan: async () => ({}),
  setCustomerServiceCharacteristics: async (
    customer: string,
    characteristics: string,
  ) => ({
    customer,
    branch: "Nomad",
    service_characteristics: characteristics,
    service_characteristics_updated_by: "manager@example.test",
    service_characteristics_updated_at: "2026-08-19 12:00:00",
  }),
  acknowledgeEntry: async () => ({ entry: "E-1", acknowledged: true }),
  logout: async () => undefined,
} as unknown as FrappeManagementApi;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LiveManagementApplication api={api} session={session} />
  </React.StrictMode>,
);
