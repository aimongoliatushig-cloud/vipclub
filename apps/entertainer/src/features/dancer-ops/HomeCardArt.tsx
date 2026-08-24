import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

const earningsBars = [
  { day: "Мя", value: 34 },
  { day: "Лх", value: 48 },
  { day: "Пү", value: 39 },
  { day: "Ба", value: 68 },
  { day: "Бя", value: 56 },
  { day: "Ня", value: 82 },
];

const loanRepaymentRates = [10, 15, 20, 25, 30].map((value) => ({ value }));

export function EarningsCardArt() {
  return (
    <span className="ops-card-art is-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={earningsBars} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey="value" radius={[8, 8, 8, 8]} isAnimationActive={false}>
            {earningsBars.map((entry, index) => (
              <Cell
                key={entry.day}
                fill={index === earningsBars.length - 1 ? "var(--card-accent)" : "var(--card-chart-muted)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </span>
  );
}

export function AttendanceCardArt() {
  return <ProgressRing value={93} />;
}

export function RankCardArt() {
  return <ProgressRing value={84.6} />;
}

export function RequestsCardArt() {
  const requestTypes = [
    { key: "leave", value: 1, fill: "var(--card-accent)" },
    { key: "attendance", value: 1, fill: "var(--card-chart-muted)" },
    { key: "profile", value: 1, fill: "var(--card-accent-soft)" },
    { key: "feedback", value: 1, fill: "var(--card-chart-muted)" },
  ];

  return (
    <span className="ops-card-art is-ring">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={requestTypes}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius="54%"
            outerRadius="86%"
            startAngle={90}
            endAngle={-270}
            cornerRadius={7}
            paddingAngle={7}
            stroke="none"
            isAnimationActive={false}
          >
            {requestTypes.map((item) => <Cell key={item.key} fill={item.fill} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </span>
  );
}

export function LoanCardArt() {
  return (
    <span className="ops-card-art is-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={loanRepaymentRates} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <Bar dataKey="value" radius={[8, 8, 8, 8]} isAnimationActive={false}>
            {loanRepaymentRates.map((entry, index) => (
              <Cell
                key={entry.value}
                fill={index === 2 ? "var(--card-accent)" : "var(--card-chart-muted)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </span>
  );
}

function ProgressRing({ value }: { value: number }) {
  const data = [
    { key: "complete", value },
    { key: "remaining", value: 100 - value },
  ];

  return (
    <span className="ops-card-art is-ring">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="86%"
            startAngle={90}
            endAngle={-270}
            cornerRadius={8}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill="var(--card-accent)" />
            <Cell fill="var(--card-chart-muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </span>
  );
}
