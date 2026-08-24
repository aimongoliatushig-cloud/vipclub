import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Camera, CheckCircle2, ChevronRight, Clock3, QrCode, RefreshCw, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { attendanceRecords, type AttendanceRecord } from "./model";
import { PageHeader } from "./ui";

type ScannerState = "idle" | "requesting" | "scanning" | "manual" | "review" | "success";
type BarcodeResult = { rawValue: string };
type BarcodeDetectorInstance = { detect: (source: HTMLVideoElement) => Promise<BarcodeResult[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

const expectedAttendanceQr = "VIP-NOMAD-20260824-2100";
const currentShift = { branch: "Nomad", time: "21:00–04:00" };

export function AttendanceScreen({ onRecord }: { onRecord: (record: AttendanceRecord) => void }) {
  const [todayCheckIn, setTodayCheckIn] = useState("20:56");

  return (
    <div className="ops-screen ops-attendance-screen" data-screen="attendance">
      <PageHeader title="QR ирц" subtitle="8 сарын бүртгэл" />

      <QrScannerPanel onRecorded={setTodayCheckIn} />

      <section className="ops-attendance-current" aria-label="Өнөөдрийн QR ирц">
        <span className="ops-attendance-current-icon"><QrCode aria-hidden="true" /></span>
        <span>
          <small>Өнөөдрийн бүртгэл</small>
          <strong>{todayCheckIn} · Цагтаа</strong>
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

function QrScannerPanel({ onRecorded }: { onRecorded: (time: string) => void }) {
  const [scannerState, setScannerState] = useState<ScannerState>("idle");
  const [scannerMessage, setScannerMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [recordedAt, setRecordedAt] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const detectingRef = useRef(false);
  const cameraRequestRef = useRef(0);

  const releaseCamera = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectingRef.current = false;
  }, []);

  useEffect(() => () => {
    cameraRequestRef.current += 1;
    releaseCamera();
  }, [releaseCamera]);

  const validateQr = useCallback((rawValue: string) => {
    const normalized = rawValue.trim().toUpperCase();
    releaseCamera();
    if (normalized !== expectedAttendanceQr) {
      setScannerState("manual");
      setScannerMessage(`Энэ QR ${currentShift.branch} · ${currentShift.time} ээлжтэй тохирохгүй байна.`);
      return;
    }
    setManualCode(normalized);
    setScannerMessage("");
    setScannerState("review");
  }, [releaseCamera]);

  const startScanner = useCallback(async () => {
    releaseCamera();
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    setScannerMessage("");
    setScannerState("requesting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerState("manual");
      setScannerMessage("Энэ төхөөрөмж камераар QR унших боломжгүй байна. QR кодын доорх кодыг оруулна уу.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (!videoRef.current) {
        releaseCamera();
        setScannerState("manual");
        setScannerMessage("Камерын дүрсийг нээж чадсангүй. QR кодын доорх кодыг оруулна уу.");
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) {
        releaseCamera();
        setScannerState("manual");
        setScannerMessage("Энэ хөтөч QR-ийг автоматаар танихгүй байна. QR кодын доорх кодыг оруулна уу.");
        return;
      }

      const detector = new Detector({ formats: ["qr_code"] });
      setScannerState("scanning");
      timerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || detectingRef.current) return;
        detectingRef.current = true;
        try {
          const [result] = await detector.detect(video);
          if (result?.rawValue) validateQr(result.rawValue);
        } catch {
          // A single unreadable frame is normal; scanning continues.
        } finally {
          detectingRef.current = false;
        }
      }, 450);
    } catch (error) {
      if (requestId !== cameraRequestRef.current) return;
      releaseCamera();
      const errorName = error instanceof DOMException ? error.name : "";
      setScannerState("manual");
      setScannerMessage(
        errorName === "NotAllowedError"
          ? "Камерын эрх хаалттай байна. Хөтчийн тохиргооноос камерын эрхийг нээгээд дахин оролдоно уу."
          : errorName === "NotFoundError"
            ? "Энэ төхөөрөмжөөс камер олдсонгүй. QR кодын доорх кодыг оруулна уу."
            : "Камерыг нээж чадсангүй. Дахин оролдох эсвэл QR кодын доорх кодыг оруулна уу.",
      );
    }
  }, [releaseCamera, validateQr]);

  const stopScanner = () => {
    cameraRequestRef.current += 1;
    releaseCamera();
    setScannerMessage("");
    setScannerState("idle");
  };

  const submitManualCode = () => {
    if (!manualCode.trim()) {
      setScannerMessage("QR кодын доорх кодыг оруулна уу.");
      return;
    }
    validateQr(manualCode);
  };

  const confirmAttendance = () => {
    const time = new Intl.DateTimeFormat("mn-MN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    setRecordedAt(time);
    onRecorded(time);
    setScannerState("success");
  };

  const isBusy = scannerState === "requesting";
  const isScanning = scannerState === "scanning";
  const showManualEntry = scannerState === "manual";

  return (
    <section className={`ops-qr-scanner is-${scannerState}`} aria-labelledby="qr-scanner-title">
      <header className="ops-qr-scanner-header">
        <span><QrCode aria-hidden="true" /></span>
        <div>
          <small>Утасны камера</small>
          <h2 id="qr-scanner-title">Ирцийн QR уншуулах</h2>
        </div>
      </header>

      <div className="ops-qr-shift" aria-label="Бүртгэх ээлж">
        <span><small>Салбар</small><strong>{currentShift.branch}</strong></span>
        <i aria-hidden="true" />
        <span><small>Ээлж</small><strong>{currentShift.time}</strong></span>
      </div>

      {(scannerState === "idle" || isBusy) && (
        <div className="ops-qr-start-state">
          <div className="ops-qr-illustration" aria-hidden="true"><QrCode /><i /><i /><i /><i /></div>
          <p>Тайзан дээрх ирцийн QR-ийг камерын хүрээнд байрлуулна уу.</p>
          <button className="ops-primary-button" type="button" onClick={startScanner} disabled={isBusy}>
            {isBusy ? <><span className="ops-button-spinner" aria-hidden="true" />Камер нээж байна…</> : <><Camera aria-hidden="true" />Камер нээх</>}
          </button>
          {isBusy && <button className="ops-text-button" type="button" onClick={stopScanner}>Камерын хүсэлтийг цуцлах</button>}
        </div>
      )}

      <div className={`ops-qr-camera${isScanning ? " is-visible" : ""}`} aria-hidden={!isScanning}>
        <video ref={videoRef} muted playsInline aria-label="QR уншуулах камерын дүрс" />
        {isScanning && (
          <>
          <span className="ops-qr-frame" aria-hidden="true"><i /><i /><i /><i /></span>
          <p aria-live="polite">QR код хайж байна…</p>
          <button className="ops-secondary-button" type="button" onClick={stopScanner}><X aria-hidden="true" />Камер хаах</button>
          </>
        )}
      </div>

      {showManualEntry && (
        <div className="ops-qr-manual">
          {scannerMessage && <p className="ops-qr-error" role="alert"><TriangleAlert aria-hidden="true" />{scannerMessage}</p>}
          <label htmlFor="attendance-qr-code">QR кодын доорх код</label>
          <input
            id="attendance-qr-code"
            value={manualCode}
            onChange={(event) => { setManualCode(event.target.value); setScannerMessage(""); }}
            placeholder="Жишээ: VIP-NOMAD-…"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="ops-qr-actions">
            <button className="ops-primary-button" type="button" onClick={submitManualCode}>Код шалгах</button>
            <button className="ops-secondary-button" type="button" onClick={startScanner}><RefreshCw aria-hidden="true" />Камераар дахин унших</button>
          </div>
        </div>
      )}

      {scannerState === "review" && (
        <div className="ops-qr-review" aria-live="polite">
          <span><ShieldCheck aria-hidden="true" /></span>
          <div><small>QR танигдлаа</small><strong>{currentShift.branch} · {currentShift.time}</strong><p>Энэ ээлжид ирц бүртгэгдэнэ.</p></div>
          <button className="ops-primary-button" type="button" onClick={confirmAttendance}>Ирц бүртгэх</button>
          <button className="ops-text-button" type="button" onClick={startScanner}>Өөр QR уншуулах</button>
        </div>
      )}

      {scannerState === "success" && (
        <div className="ops-qr-success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div><small>Амжилттай</small><strong>Ирц {recordedAt}-д бүртгэгдлээ</strong><span>{currentShift.branch} · {currentShift.time}</span></div>
        </div>
      )}

      <p className="ops-qr-privacy"><ShieldCheck aria-hidden="true" />Камерын дүрс хадгалагдахгүй. Зөвхөн QR кодыг танина.</p>
    </section>
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
