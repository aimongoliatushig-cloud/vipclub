import { CalendarDays, CheckCircle2, ChevronRight, Clock3, QrCode, TriangleAlert } from "lucide-react";
import { attendanceRecords, type AttendanceRecord } from "./model";
import { PageHeader } from "./ui";

export function AttendanceScreen({ onRecord }: { onRecord: (record: AttendanceRecord) => void }) {
  return (
    <div className="ops-screen ops-attendance-screen" data-screen="attendance">
      <PageHeader title="QR ирц" subtitle="8 сарын бүртгэл" />

      <section className="ops-attendance-current" aria-label="Өнөөдрийн QR ирц">
        <span className="ops-attendance-current-icon"><QrCode aria-hidden="true" /></span>
        <span>
          <small>Өнөөдрийн бүртгэл</small>
          <strong>20:56 · Цагтаа</strong>
          <span>Nomad · Ээлж 21:00–04:00</span>
        </span>
        <CheckCircle2 aria-hidden="true" />
      </section>

      <section className="ops-attendance-score" aria-labelledby="attendance-score-title">
        <div>
          <small id="attendance-score-title">Цаг баримтлал</small>
          <strong>90.9%</strong>
          <span>22 хуваарьт өдрөөс 20 өдөр ирсэн</span>
        </div>
        <span className="ops-attendance-ring" aria-label="Цаг баримтлал 90.9 хувь"><i>20/22</i></span>
      </section>

      <section className="ops-analytics-metrics" aria-label="Ирцийн сарын үзүүлэлт">
        <article><small>Ирсэн</small><strong>20</strong><span>90.9%</span></article>
        <article className="is-warning"><small>Хоцорсон</small><strong>2</strong><span>9.1%</span></article>
        <article className="is-danger"><small>Тасалсан</small><strong>1</strong><span>0 оноотой өдөр</span></article>
      </section>

      <section className="ops-attendance-calendar" aria-labelledby="attendance-calendar-title">
        <div className="ops-section-heading">
          <h2 id="attendance-calendar-title">8 сарын 18–24</h2>
          <span>QR бүртгэл</span>
        </div>
        <div className="ops-calendar-week" role="list" aria-label="Ирцийн долоо хоног">
          {[
            ["18", "Хэвийн", "Да"],
            ["19", "Хэвийн", "Мя"],
            ["20", "Тасалсан", "Лх"],
            ["21", "Зөвшөөрсөн чөлөө", "Пү"],
            ["22", "Хоцорсон", "Ба"],
            ["23", "Хэвийн", "Бя"],
            ["24", "Хэвийн", "Ня"],
          ].map(([day, status, weekday]) => (
            <div className={`is-${calendarTone(status)}`} role="listitem" key={day} aria-label={`${day}-ны ${weekday}, ${status}`}>
              <small>{weekday}</small>
              <strong>{day}</strong>
              <i aria-hidden="true" />
            </div>
          ))}
        </div>
        <div className="ops-calendar-legend" aria-label="Тайлбар">
          <span><i className="is-success" />Хэвийн</span>
          <span><i className="is-warning" />Хоцорсон</span>
          <span><i className="is-danger" />Тасалсан</span>
          <span><i className="is-neutral" />Чөлөө</span>
        </div>
      </section>

      <section className="ops-section" aria-labelledby="attendance-history-title">
        <div className="ops-section-heading">
          <h2 id="attendance-history-title">Өдрийн бүртгэл</h2>
          <span>{attendanceRecords.length} өдөр</span>
        </div>
        <div className="ops-attendance-list">
          {attendanceRecords.map((record) => (
            <button type="button" key={record.id} onClick={() => onRecord(record)}>
              <span className={`ops-attendance-row-icon is-${calendarTone(record.status)}`}>
                {record.status === "Хоцорсон" || record.status === "Тасалсан" ? <TriangleAlert aria-hidden="true" /> : record.status === "Зөвшөөрсөн чөлөө" ? <CalendarDays aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
              </span>
              <span><strong>{record.weekday} · {record.date}</strong><small>{record.checkIn === "—" ? record.variance : `${record.checkIn} орсон · ${record.checkOut}`}</small></span>
              <span className={`is-${calendarTone(record.status)}`}>{record.status}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AttendanceDetailScreen({
  record,
  onBack,
  onRequestCorrection,
}: {
  record: AttendanceRecord;
  onBack: () => void;
  onRequestCorrection: () => void;
}) {
  return (
    <div className="ops-screen" data-screen="attendance-day">
      <PageHeader title="Ирцийн дэлгэрэнгүй" onBack={onBack} />
      <section className={`ops-attendance-day-hero is-${calendarTone(record.status)}`}>
        <small>{record.weekday} · {record.date}</small>
        <strong>{record.status}</strong>
        <span>{record.branch} · {record.scheduled}</span>
      </section>
      <div className="ops-key-value-list" role="list">
        <KeyValue label="Хуваарьт цаг" value={record.scheduled} />
        <KeyValue label="QR орсон цаг" value={record.checkIn} />
        <KeyValue label="Гарсан цаг" value={record.checkOut} />
        <KeyValue label="Зөрүү" value={record.variance} tone={record.status === "Тасалсан" ? "danger" : record.status === "Хоцорсон" ? "warning" : undefined} />
        <KeyValue label="Зэрэгт нөлөөлөх нь" value={record.rankImpact} />
        <KeyValue label="Мэдээллийн төлөв" value="Баталгаажсан" tone="success" />
      </div>
      <button className="ops-secondary-button ops-sticky-action" type="button" onClick={onRequestCorrection}>Ирц засуулах хүсэлт гаргах</button>
    </div>
  );
}

function calendarTone(status: string) {
  if (status === "Хоцорсон") return "warning";
  if (status === "Тасалсан") return "danger";
  if (status === "Зөвшөөрсөн чөлөө") return "neutral";
  return "success";
}

function KeyValue({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" | "danger" }) {
  return <div className="ops-key-value" role="listitem"><span>{label}</span><strong className={tone ? `is-${tone}` : ""}>{value}</strong></div>;
}
