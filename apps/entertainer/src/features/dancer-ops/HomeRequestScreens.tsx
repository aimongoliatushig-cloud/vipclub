import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardPenLine,
  ClipboardList,
  Clock3,
  LockKeyhole,
  MapPin,
  Medal,
  MessageSquareText,
  QrCode,
  Send,
  ShieldCheck,
  TimerReset,
  UserRoundPen,
  WalletCards,
} from "lucide-react";
import {
  AttendanceCardArt,
  EarningsCardArt,
  LoanCardArt,
  RankCardArt,
  RequestsCardArt,
} from "./HomeCardArt";
import type { OpsLocale } from "./locale";
import { formatCountdown, formatMoney, loanPolicy, type LoanRequest, type RequestState } from "./model";
import { DisclosureRow, MobileHeader, ModuleCard, PageHeader, StatusMark, type OpsTheme } from "./ui";

export function HomeScreen({
  todayEarnings,
  unreadNotifications,
  theme,
  locale,
  loanRequest,
  onEarnings,
  onAttendance,
  onRank,
  onRequests,
  onLoan,
  onThemeToggle,
  onNotifications,
}: {
  todayEarnings: number;
  unreadNotifications: number;
  theme: OpsTheme;
  locale: OpsLocale;
  loanRequest: LoanRequest | null;
  onEarnings: () => void;
  onAttendance: () => void;
  onRank: () => void;
  onRequests: () => void;
  onLoan: () => void;
  onThemeToggle: () => void;
  onNotifications: () => void;
}) {
  return (
    <div className="ops-screen ops-home-screen" data-screen="home">
      <MobileHeader theme={theme} locale={locale} unreadCount={unreadNotifications} onThemeToggle={onThemeToggle} onNotifications={onNotifications} />
      <div className="ops-home-greeting">
        <h1>Оройн мэнд, Ану</h1>
        <p>Өнөөдөр · Nomad</p>
      </div>

      <section className="ops-module-grid" aria-label="Миний ажлын мэдээлэл">
        <ModuleCard
          title="Орлого"
          value={formatMoney(todayEarnings)}
          detail="Өнөөдрийн цэвэр авах дүн"
          icon={<WalletCards aria-hidden="true" />}
          visual={<EarningsCardArt />}
          onClick={onEarnings}
          emphasis="hero"
          accent="deep-indigo"
          wide
        />
        <ModuleCard
          title="Ирц"
          value="20:56"
          detail="Цагтаа"
          icon={<QrCode aria-hidden="true" />}
          visual={<AttendanceCardArt />}
          onClick={onAttendance}
          accent="periwinkle"
        />
        <ModuleCard
          title="Зэрэг"
          value="84.6"
          detail="2-р зэрэг"
          icon={<Medal aria-hidden="true" />}
          visual={<RankCardArt />}
          onClick={onRank}
          accent="indigo"
        />
        <ModuleCard
          title="Хүсэлт"
          value="Илгээх"
          detail="Чөлөө · Ирц · Санал"
          icon={<ClipboardList aria-hidden="true" />}
          visual={<RequestsCardArt />}
          onClick={onRequests}
          accent="lavender"
          wide
        />
        <ModuleCard
          title="Зээл"
          value={loanRequest ? formatMoney(loanRequest.amount) : formatMoney(loanPolicy.maximumAmount)}
          detail={loanRequest ? loanRequest.status : "Хүсэх дээд дүн"}
          icon={<WalletCards aria-hidden="true" />}
          visual={<LoanCardArt />}
          onClick={onLoan}
          accent="indigo"
          wide
        />
      </section>

      <section className="ops-attention-card" aria-labelledby="home-attention-title">
        <header>
          <span><CircleAlert aria-hidden="true" /></span>
          <h2 id="home-attention-title">Анхаарах зүйлс</h2>
        </header>
        <div>
          <button type="button" onClick={onAttendance}>
            <Clock3 aria-hidden="true" />
            <span><strong>Хоцролтоо багасгах</strong><small>Ээлжээс 15 минутын өмнө ирэх</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" onClick={onRank}>
            <Medal aria-hidden="true" />
            <span><strong>Өдрийн гараанд гарах</strong><small>Одоогийн үзүүлэлт · 78 оноо</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

type PersonalRequestKind = "leave" | "attendance" | "profile" | "feedback";

const personalRequestOptions = [
  { id: "leave", title: "Чөлөө авах", detail: "Цагийн болон өдрийн чөлөө", icon: CalendarClock },
  { id: "attendance", title: "Ирц засуулах", detail: "QR болон цагийн бүртгэл", icon: ClipboardPenLine },
  { id: "profile", title: "Профайл өөрчлөх", detail: "Зураг болон хувийн мэдээлэл", icon: UserRoundPen },
  { id: "feedback", title: "Санал, гомдол", detail: "Ажлын орчин, үйлчилгээний санал", icon: MessageSquareText },
] satisfies Array<{ id: PersonalRequestKind; title: string; detail: string; icon: typeof CalendarClock }>;

export function RequestCenterScreen({ onSubmitted }: { onSubmitted: (message: string) => void }) {
  const [selectedKind, setSelectedKind] = useState<PersonalRequestKind | null>(null);
  const [submitted, setSubmitted] = useState<{ title: string; detail: string } | null>(null);
  const selected = personalRequestOptions.find((item) => item.id === selectedKind);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const message = selected.id === "feedback" ? "Санал, гомдол илгээгдлээ." : `${selected.title} хүсэлт илгээгдлээ.`;
    setSubmitted({ title: selected.title, detail: "Өнөөдөр · Шийдвэр хүлээж байна" });
    setSelectedKind(null);
    onSubmitted(message);
  };

  if (selected) {
    return (
      <div className="ops-screen ops-personal-request-screen" data-screen={`request-${selected.id}`}>
        <PageHeader title={selected.title} onBack={() => setSelectedKind(null)} />
        <form className="ops-personal-request-form" onSubmit={submit}>
          <RequestFields kind={selected.id} />
          <button className="ops-primary-button" type="submit">
            <Send aria-hidden="true" />
            {selected.id === "feedback" ? "Санал, гомдол илгээх" : `${selected.title} хүсэлт илгээх`}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="ops-screen ops-request-center" data-screen="requests">
      <PageHeader title="Санал, хүсэлт" subtitle="Илгээх болон явцаа хянах" />
      <section className="ops-request-center-intro" aria-labelledby="request-action-title">
        <small>Хүсэлтийн төв</small>
        <h2 id="request-action-title">Юу илгээх вэ?</h2>
        <p>Төрлөө сонгоод шаардлагатай мэдээллийг бөглөнө.</p>
      </section>
      <section className="ops-request-choice-list" aria-label="Хүсэлтийн төрөл">
        {personalRequestOptions.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelectedKind(item.id)}>
            <span className="ops-request-choice-icon"><item.icon aria-hidden="true" /></span>
            <span><strong>{item.title}</strong><small>{item.detail}</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
      </section>
      <section className="ops-request-status-section" aria-labelledby="my-requests-title">
        <h2 id="my-requests-title">Миний хүсэлтүүд</h2>
        {submitted ? (
          <article>
            <CheckCircle2 aria-hidden="true" />
            <span><strong>{submitted.title}</strong><small>{submitted.detail}</small></span>
            <b>Илгээсэн</b>
          </article>
        ) : (
          <p>Хүсэлт илгээсний дараа явц, шийдвэр нь энд харагдана.</p>
        )}
      </section>
    </div>
  );
}

function RequestFields({ kind }: { kind: PersonalRequestKind }) {
  if (kind === "leave") {
    return (
      <>
        <label><span>Чөлөөний төрөл</span><select name="leave_type" defaultValue="hourly" required><option value="hourly">Цагийн чөлөө</option><option value="day">Өдрийн чөлөө</option></select></label>
        <label><span>Чөлөө авах өдөр</span><input name="leave_date" type="date" min="2026-08-25" required /></label>
        <label><span>Шалтгаан</span><textarea name="reason" minLength={3} maxLength={300} placeholder="Товч бөгөөд ойлгомжтой бичнэ үү" required /></label>
      </>
    );
  }

  if (kind === "attendance") {
    return (
      <>
        <label><span>Засуулах бүртгэл</span><select name="attendance_type" defaultValue="check-in" required><option value="check-in">Ирсэн цаг</option><option value="qr">QR бүртгэл</option><option value="absence">Тасалсан төлөв</option></select></label>
        <label><span>Огноо</span><input name="attendance_date" type="date" required /></label>
        <label><span>Тайлбар</span><textarea name="reason" minLength={3} maxLength={300} placeholder="Ямар мэдээлэл буруу байгааг бичнэ үү" required /></label>
      </>
    );
  }

  if (kind === "profile") {
    return (
      <>
        <label><span>Өөрчлөх мэдээлэл</span><select name="profile_field" defaultValue="photo" required><option value="photo">Профайл зураг</option><option value="phone">Утасны дугаар</option><option value="display-name">Харагдах нэр</option></select></label>
        <label><span>Шинэ мэдээлэл</span><input name="new_value" type="text" minLength={2} maxLength={120} placeholder="Шинэ утгыг бичнэ үү" required /></label>
        <label><span>Тайлбар</span><textarea name="reason" maxLength={300} placeholder="Шаардлагатай бол тайлбар нэмнэ үү" /></label>
      </>
    );
  }

  return (
    <>
      <label><span>Төрөл</span><select name="feedback_type" defaultValue="suggestion" required><option value="suggestion">Санал</option><option value="complaint">Гомдол</option><option value="safety">Аюулгүй байдлын асуудал</option></select></label>
      <label><span>Хэнд илгээх</span><select name="recipient" defaultValue="manager" required><option value="manager">Салбарын менежер</option><option value="hr">Хүний нөөц</option></select></label>
      <label><span>Дэлгэрэнгүй</span><textarea name="feedback" minLength={10} maxLength={500} placeholder="Юу болсон, ямар шийдэл хүсэж байгаагаа бичнэ үү" required /></label>
    </>
  );
}

export function ServiceRequestScreen({
  state,
  countdown,
  busy,
  onDetail,
  onAccept,
  onDecline,
}: {
  state: RequestState;
  countdown: number;
  busy: boolean;
  onDetail: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (state === "accepted") {
    return (
      <div className="ops-screen ops-centered-state" data-screen="service-request-accepted">
        <span className="ops-state-icon is-success"><Check aria-hidden="true" /></span>
        <h1>Хүсэлтийг зөвшөөрсөн</h1>
        <p>VIP 03 үйлчилгээ идэвхтэй байна.</p>
      </div>
    );
  }

  if (state === "declined" || state === "completed" || countdown === 0) {
    return (
      <div className="ops-screen" data-screen="service-request-empty">
        <PageHeader title="Үйлчилгээний хүсэлт" />
        <div className="ops-empty-state">
          <ClipboardEmptyIcon />
          <h2>{countdown === 0 ? "Хүсэлтийн хугацаа дууссан" : "Идэвхтэй хүсэлт алга"}</h2>
          <p>Шинэ үйлчилгээний хүсэлт ирвэл энд нэн түрүүнд харагдана.</p>
        </div>
        <section className="ops-history-list" aria-labelledby="request-history-title">
          <h2 id="request-history-title">Сүүлийн хүсэлт</h2>
          <DisclosureRow title="VIP 03 · 2 цаг" detail="Өнөөдөр 21:52" meta={countdown === 0 ? "Хугацаа дууссан" : state === "completed" ? "Дууссан" : "Татгалзсан"} />
        </section>
      </div>
    );
  }

  const progress = `${Math.max(0, Math.min(100, (countdown / 98) * 100))}%`;
  return (
    <div className="ops-screen ops-request-screen" data-screen="service-request">
      <PageHeader title="Үйлчилгээний шинэ хүсэлт" />
      <section className="ops-request-timer" aria-label="Хариу өгөх хугацаа">
        <small>Хариу өгөх хугацаа</small>
        <strong aria-live="polite">{formatCountdown(countdown)}</strong>
        <span className="ops-countdown-track" aria-hidden="true"><i style={{ width: progress }} /></span>
      </section>

      <section className="ops-request-summary" aria-labelledby="request-room">
        <div className="ops-request-fact">
          <MapPin aria-hidden="true" />
          <strong id="request-room">VIP 03</strong>
        </div>
        <div className="ops-request-fact">
          <Clock3 aria-hidden="true" />
          <strong>2 цаг</strong>
        </div>
        <div className="ops-request-amount">
          <WalletCards aria-hidden="true" />
          <span>
            <small>Таны авах дүн</small>
            <strong>{formatMoney(240_000)}</strong>
          </span>
        </div>
      </section>

      <button className="ops-detail-link" type="button" onClick={onDetail}>
        Дэлгэрэнгүй харах
        <ChevronRight aria-hidden="true" />
      </button>

      <div className="ops-request-actions">
        <button className="ops-primary-button" type="button" disabled={busy} onClick={onAccept}>
          {busy ? <span className="ops-button-spinner" aria-hidden="true" /> : null}
          {busy ? "Зөвшөөрч байна…" : "Зөвшөөрөх"}
        </button>
        <button className="ops-text-button is-danger" type="button" disabled={busy} onClick={onDecline}>
          Татгалзах
        </button>
      </div>

      <p className="ops-privacy-note"><LockKeyhole aria-hidden="true" /> Шийдвэр гаргахад хэрэгтэй мэдээллийг л харуулав.</p>
    </div>
  );
}

export function RequestDetailScreen({ onBack, onAccept, busy }: { onBack: () => void; onAccept: () => void; busy: boolean }) {
  return (
    <div className="ops-screen" data-screen="request-detail">
      <PageHeader title="Хүсэлтийн дэлгэрэнгүй" onBack={onBack} />
      <section className="ops-detail-amount">
        <small>Таны авах тооцоолсон дүн</small>
        <strong>{formatMoney(240_000)}</strong>
        <span>VIP 03 · 2 цаг</span>
      </section>
      <div className="ops-key-value-list" role="list">
        <KeyValue label="Үйлчилгээ" value="VIP үйлчилгээ" />
        <KeyValue label="Салбар" value="Nomad" />
        <KeyValue label="Эхлэх цаг" value="22:18" />
        <KeyValue label="Нийт дүн" value={formatMoney(400_000)} />
        <KeyValue label="Тооцоолсон хувь" value="Тухайн үйлчилгээний дүрмээр" />
        <KeyValue label="Тэмдэглэл" value="Өрөөнд очоод эхлэлийг баталгаажуулна." />
      </div>
      <div className="ops-trust-note"><ShieldCheck aria-hidden="true" /><span><strong>Нууцлал хамгаалагдсан</strong><small>Хэрэглэгчийн хувийн мэдээллийг энэ шийдвэрт харуулахгүй.</small></span></div>
      <button className="ops-primary-button ops-sticky-action" type="button" disabled={busy} onClick={onAccept}>
        {busy ? "Зөвшөөрч байна…" : "Хүсэлтийг зөвшөөрөх"}
      </button>
    </div>
  );
}

export function ActiveServiceScreen({
  remaining,
  extensionRequested,
  onBack,
  onExtension,
  onComplete,
}: {
  remaining: number;
  extensionRequested: boolean;
  onBack: () => void;
  onExtension: () => void;
  onComplete: () => void;
}) {
  const total = 2 * 60 * 60;
  const progress = `${Math.max(2, Math.min(100, (remaining / total) * 100))}%`;
  return (
    <div className="ops-screen ops-service-screen" data-screen="active-service">
      <PageHeader title="VIP үйлчилгээ" onBack={onBack} />
      <section className="ops-service-location">
        <small>VIP 03</small>
        <strong>Nomad</strong>
      </section>
      <section className="ops-service-timer" aria-label="Үйлчилгээний үлдсэн хугацаа">
        <small>Үлдсэн</small>
        <strong>{formatCountdown(Math.floor(remaining / 60))}</strong>
        <span className="ops-countdown-track" aria-hidden="true"><i style={{ width: progress }} /></span>
        <p>Эхэлсэн 22:18 · Дуусах 00:18</p>
        <span className="ops-live-state"><StatusMark status="Боломжтой" /> Үйлчилгээ үргэлжилж байна</span>
      </section>
      <DisclosureRow
        title={extensionRequested ? "Сунгалтын хүсэлт илгээсэн" : "Сунгалт хүсэх"}
        detail={extensionRequested ? "Хариу ирэхэд мэдэгдэнэ" : "Үйлчилгээ дуусахаас өмнө хүсэлт илгээнэ"}
        icon={<TimerReset aria-hidden="true" />}
        tone={extensionRequested ? "success" : "primary"}
        onClick={extensionRequested ? undefined : onExtension}
      />
      <section className="ops-service-earnings">
        <small>Тооцоолсон орлого</small>
        <strong>{formatMoney(240_000)}</strong>
      </section>
      <button className="ops-primary-button ops-sticky-action" type="button" onClick={onComplete}>Үйлчилгээ дуусгах</button>
    </div>
  );
}

export function CompletionScreen({ onContinue, onEarnings }: { onContinue: () => void; onEarnings: () => void }) {
  return (
    <div className="ops-screen ops-completion-screen" data-screen="completion">
      <div className="ops-completion-mark" aria-hidden="true"><Check /></div>
      <small>VIP 03</small>
      <h1>Үйлчилгээ дууслаа</h1>
      <p>2 цаг</p>
      <strong>{formatMoney(240_000)}</strong>
      <span>Баталгаажсан орлогод нэмэгдлээ.</span>
      <button className="ops-primary-button" type="button" onClick={onContinue}>Нүүр рүү очих <ArrowRight aria-hidden="true" /></button>
      <button className="ops-text-button" type="button" onClick={onEarnings}>Орлогын дэлгэрэнгүй</button>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return <div className="ops-key-value" role="listitem"><span>{label}</span><strong>{value}</strong></div>;
}

function ClipboardEmptyIcon() {
  return (
    <span className="ops-empty-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M9 5h6M9 3h6v4H9zM7 5H5v16h14V5h-2M8 12h8M8 16h5" /></svg>
    </span>
  );
}
