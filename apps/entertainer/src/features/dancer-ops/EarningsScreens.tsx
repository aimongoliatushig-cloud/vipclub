import { useMemo, useState } from "react";
import {
  ChevronRight,
  MinusCircle,
  ShieldCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  deductionRecords,
  earningsByPeriod,
  formatMoney,
  transactions,
  type EarningsPeriod,
  type Transaction,
} from "./model";
import { PageHeader, SegmentedControl } from "./ui";

export function EarningsScreen({
  todayEarnings,
  onTransaction,
  onAdjustment,
}: {
  todayEarnings: number;
  onTransaction: (transaction: Transaction) => void;
  onAdjustment: () => void;
}) {
  const [period, setPeriod] = useState<EarningsPeriod>("week");
  const selected = earningsByPeriod[period];
  const amount = period === "day" ? todayEarnings : selected.amount;
  const gross = period === "day" ? todayEarnings + selected.deductions : selected.gross;
  const chartData = useMemo(
    () => selected.labels.map((label, index) => ({ label, value: selected.values[index] })),
    [selected],
  );
  const composition = useMemo(() => {
    const liveServiceAmount = selected.breakdown.service + (period === "day" ? todayEarnings - selected.amount : 0);
    const items = [
      { key: "service", label: "Үйлчилгээ", value: liveServiceAmount, color: "var(--chart-service)" },
      { key: "tips", label: "Tip", value: selected.breakdown.tips, color: "var(--chart-tips)" },
      { key: "commission", label: "Комисс", value: selected.breakdown.commission, color: "var(--chart-commission)" },
    ];
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return { items: items.map((item) => ({ ...item, share: Math.round((item.value / total) * 100) })), total };
  }, [period, selected, todayEarnings]);

  return (
    <div className="ops-screen ops-earnings-screen" data-screen="earnings">
      <PageHeader title="Орлого" />
      <SegmentedControl
        label="Орлогын хугацаа"
        value={period}
        options={[
          { value: "day", label: "Өдөр" },
          { value: "week", label: "7 хоног" },
          { value: "month", label: "Сар" },
        ]}
        onChange={setPeriod}
      />

      <section className="ops-income-summary" aria-labelledby="confirmed-income">
        <small id="confirmed-income">Гарт авах дүн</small>
        <strong>{formatMoney(amount)}</strong>
        <button
          className="ops-income-calculation"
          type="button"
          onClick={onAdjustment}
          aria-label={`Орлого ${formatMoney(gross)}, суутгал ${formatMoney(selected.deductions)}. Суутгалын задаргааг харах`}
        >
          <span><small>Орлого</small><b>{formatMoney(gross)}</b></span>
          <i aria-hidden="true" />
          <span className="is-deduction"><small>Суутгал</small><b>-{formatMoney(selected.deductions)}</b></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </section>

      <section className="ops-chart-region" aria-labelledby="earnings-trend-title">
        <div className="ops-section-heading">
          <h2 id="earnings-trend-title">Орлогын хөдөлгөөн</h2>
          <span>{selected.label}</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 16, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
            <YAxis hide domain={[0, "dataMax + 60"]} />
            <Tooltip content={<EarningsTooltip />} cursor={{ fill: "var(--primary-soft)" }} />
            <Bar
              dataKey="value"
              radius={[9, 9, 9, 9]}
              maxBarSize={44}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={index === chartData.length - 1 ? "var(--primary)" : "var(--primary-border)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="ops-section" aria-labelledby="earnings-breakdown-title">
        <div className="ops-section-heading">
          <h2 id="earnings-breakdown-title">Орлогын бүтэц</h2>
          <span>{selected.label}</span>
        </div>
        <div className="ops-income-composition">
          <div className="ops-income-donut" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={composition.items}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={90}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {composition.items.map((item) => <Cell key={item.key} fill={item.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="ops-income-donut-center"><small>Нийт орлого</small><strong>{formatMoney(composition.total)}</strong></span>
          </div>
          <div className="ops-income-legend" role="list" aria-label={`${selected.label}ийн орлогын төрлүүд`}>
            {composition.items.map((item) => (
              <div role="listitem" key={item.key}>
                <i className={`is-${item.key}`} aria-hidden="true" />
                <span><strong>{item.label}</strong><small>{formatMoney(item.value)}</small></span>
                <b>{item.share}%</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ops-section" aria-labelledby="recent-transactions-title">
        <div className="ops-section-heading">
          <h2 id="recent-transactions-title">Сүүлийн гүйлгээ</h2>
          <span>3 гүйлгээ</span>
        </div>
        <div className="ops-open-list">
          {transactions.map((transaction) => (
            <button className="ops-transaction-row" type="button" key={transaction.id} onClick={() => onTransaction(transaction)}>
              <span>
                <strong>{transaction.type}</strong>
                <small>{transaction.date === "2026.08.24" ? "Өнөөдөр" : "Өчигдөр"} · {transaction.time}</small>
              </span>
              <span className="ops-transaction-amount">
                <strong>+{formatMoney(transaction.amount)}</strong>
                <small className={transaction.status === "Хүлээгдэж байна" ? "is-warning" : "is-success"}>{transaction.status}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <button className="ops-adjustment-entry" type="button" onClick={onAdjustment}>
        <MinusCircle aria-hidden="true" />
        <span><strong>Засвар, суутгал</strong><small>Бүх төрөл, шалтгаан, эх сурвалжийг харна</small></span>
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}

export function TransactionDetailScreen({ transaction, onBack }: { transaction: Transaction; onBack: () => void }) {
  return (
    <div className="ops-screen" data-screen="transaction-detail">
      <PageHeader title="Гүйлгээний дэлгэрэнгүй" onBack={onBack} />
      <section className="ops-detail-amount">
        <small>{transaction.type}</small>
        <strong>+{formatMoney(transaction.amount)}</strong>
        <span className={transaction.status === "Хүлээгдэж байна" ? "is-warning" : "is-success"}>{transaction.status}</span>
      </section>
      <div className="ops-key-value-list" role="list">
        <KeyValue label="Огноо, цаг" value={`${transaction.date} · ${transaction.time}`} />
        <KeyValue label="Салбар" value={transaction.branch} />
        <KeyValue label="Үйлчилгээний лавлагаа" value={transaction.reference} />
        <KeyValue label="Нийт дүн" value={formatMoney(transaction.gross)} />
        <KeyValue label="Таны хувь" value={formatMoney(transaction.share)} />
        <KeyValue label="Засвар" value={transaction.adjustment ? formatMoney(transaction.adjustment) : "Байхгүй"} />
        <KeyValue label="Эцсийн дүн" value={formatMoney(transaction.amount)} />
      </div>
      <div className="ops-trust-note"><ShieldCheck aria-hidden="true" /><span><strong>Баталгаажсан бүртгэл</strong><small>Тооцооны эх сурвалж ба төлөв шалгагдсан.</small></span></div>
    </div>
  );
}

export function AdjustmentScreen({ onBack, onExplain }: { onBack: () => void; onExplain: () => void }) {
  const [selectedId, setSelectedId] = useState(deductionRecords[0].id);
  const selected = deductionRecords.find((record) => record.id === selectedId) || deductionRecords[0];
  const total = deductionRecords.reduce((sum, record) => sum + record.amount, 0);

  return (
    <div className="ops-screen" data-screen="adjustment">
      <PageHeader title="Засвар, суутгал" onBack={onBack} />
      <section className="ops-detail-amount is-quiet">
        <small>Энэ сарын нийт суутгал</small>
        <strong>-{formatMoney(total)}</strong>
        <span>{deductionRecords.length} баталгаажсан бүртгэл</span>
      </section>
      <section className="ops-section" aria-labelledby="deduction-list-title">
        <div className="ops-section-heading"><h2 id="deduction-list-title">Суутгалын бүтэц</h2><span>8 сар</span></div>
        <div className="ops-deduction-list">
          {deductionRecords.map((record) => (
            <button type="button" key={record.id} className={record.id === selected.id ? "is-selected" : ""} onClick={() => setSelectedId(record.id)}>
              <span><strong>{record.title}</strong><small>{record.date} · {record.branch}</small></span>
              <strong>-{formatMoney(record.amount)}</strong>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <section className="ops-adjustment-record">
        <header><span><strong>{selected.title}</strong><small>{selected.date} · {selected.branch}</small></span><strong>-{formatMoney(selected.amount)}</strong></header>
        <dl>
          <div><dt>Шалтгаан</dt><dd>{selected.reason}</dd></div>
          <div><dt>Төлөв</dt><dd>{selected.status}</dd></div>
          <div><dt>Эх сурвалж</dt><dd>{selected.source}</dd></div>
        </dl>
        <button className="ops-secondary-button" type="button" onClick={onExplain}>Тайлбар хүсэх</button>
      </section>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return <div className="ops-key-value" role="listitem"><span>{label}</span><strong>{value}</strong></div>;
}

function EarningsTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="ops-chart-tooltip"><small>{label}</small><strong>{formatMoney((payload[0].value || 0) * 1_000)}</strong></div>;
}
