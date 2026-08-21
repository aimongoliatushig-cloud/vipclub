import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  UserRoundX,
  UsersRound,
  X,
} from "lucide-react";
import { api } from "../../api";
import type { RosterCandidate, RosterCandidateData } from "../../api";
import "./RosterReview.css";

type ReviewStatus = RosterCandidateData["status"];
type Decision = "Entertainer" | "Staff" | "Inactive";

const STATUS_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: "Pending", label: "Шалгах" },
  { value: "Entertainer", label: "Бүжигчин" },
  { value: "Staff", label: "Бусад ажилтан" },
  { value: "Inactive", label: "Хамааралгүй" },
  { value: "All", label: "Бүгд" },
];

const DECISIONS: {
  value: Decision;
  label: string;
  description: string;
  icon: typeof UserCheck;
}[] = [
  {
    value: "Entertainer",
    label: "Бүжигчин",
    description: "Бүжигчин гэж тэмдэглэнэ",
    icon: UserCheck,
  },
  {
    value: "Staff",
    label: "Бусад ажилтан",
    description: "Зөөгч, бармен зэрэг ажилтан",
    icon: UsersRound,
  },
  {
    value: "Inactive",
    label: "Манай ажилтан биш",
    description: "Хуучин эсвэл хамааралгүй нэр",
    icon: UserRoundX,
  },
];

const dateLabel = (value?: string | null) =>
  value ? value.replaceAll("-", ".") : "Мэдээлэлгүй";

function CandidateRow({
  row,
  profiles,
  onReviewed,
}: {
  row: RosterCandidate;
  profiles: RosterCandidateData["profiles"];
  onReviewed: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [decision, setDecision] = useState<Decision>();
  const [linkedProfile, setLinkedProfile] = useState(row.linked_profile || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requiresReason = decision === "Staff" || decision === "Inactive";
  const needsProfile = decision === "Entertainer";
  const needsLink = row.review_status === "Entertainer" && !row.linked_profile;
  const actionable = row.review_status === "Pending" || needsLink;
  const canSave = Boolean(
    decision &&
      (!requiresReason || note.trim().length >= 5) &&
      (!needsProfile || linkedProfile),
  );

  const saveDecision = async () => {
    if (!canSave || !decision) return;
    setBusy(true);
    setError("");
    try {
      await api.reviewRosterCandidate(
        row.name,
        decision,
        note.trim(),
        linkedProfile,
        row.modified,
      );
      onReviewed();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Шийдвэрийг хадгалж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  };

  const displayName =
    row.dancer_nickname || row.dancer_name || `Бүртгэл #${row.finex_dancer_id}`;
  const legalName =
    row.dancer_name && row.dancer_name !== row.dancer_nickname
      ? row.dancer_name
      : "";
  const reviewedLabel =
    row.review_status === "Entertainer"
      ? "Бүжигчин"
      : row.review_status === "Staff"
        ? "Бусад ажилтан"
        : "Хамааралгүй нэр";

  return (
    <article className={`candidate-row ${expanded ? "is-open" : ""}`}>
      <header>
        <div className="candidate-identity">
          <div className="candidate-avatar" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="candidate-name">
            <strong>{displayName}</strong>
            <small>{legalName || `Бүртгэлийн ID ${row.finex_dancer_id}`}</small>
          </div>
        </div>
        <div className="candidate-facts">
          <span>
            <small>Баримт</small>
            <strong>{row.bill_count}</strong>
          </span>
          <span>
            <small>Сүүлд бүртгэгдсэн</small>
            <strong>{dateLabel(row.last_seen)}</strong>
          </span>
          <span>
            <small>Таамагласан салбар</small>
            <strong>{row.inferred_branch || "Тодорхойгүй"}</strong>
          </span>
        </div>
        {actionable ? (
          <button
            className="review-open-button"
            type="button"
            aria-expanded={expanded}
            onClick={() => {
              setExpanded((value) => !value);
              if (needsLink) setDecision("Entertainer");
              setError("");
            }}
          >
            {expanded ? <X /> : <ChevronDown />}
            <span>{expanded ? "Хаах" : needsLink ? "Холбох" : "Шалгах"}</span>
          </button>
        ) : (
          <span
            className={`candidate-state ${row.review_status.toLowerCase()}`}
          >
            {reviewedLabel}
          </span>
        )}
      </header>

      {actionable && expanded ? (
        <div className="candidate-review">
          <div className="candidate-review-layout">
            <fieldset>
              <legend>
                {needsLink ? "Баталгаатай ажилтантай холбох" : "Ангилал сонгох"}
              </legend>
              {!needsLink ? (
                <div className="decision-grid">
                  {DECISIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={decision === option.value ? "selected" : ""}
                      aria-pressed={decision === option.value}
                      onClick={() => {
                        setDecision(option.value);
                        if (option.value !== "Entertainer")
                          setLinkedProfile("");
                        setError("");
                      }}
                    >
                      <option.icon />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="candidate-link-help">
                  Импортолсон хуваарь зөв ажилтанд харагдахын тулд баталгаатай
                  профайлыг сонгоно.
                </p>
              )}

              {needsProfile ? (
                <label className="candidate-profile-link">
                  <span>Баталгаатай ажилтан</span>
                  <select
                    value={linkedProfile}
                    onChange={(event) => {
                      setLinkedProfile(event.target.value);
                      setError("");
                    }}
                  >
                    <option value="">Ажилтан сонгох</option>
                    {profiles.map((profile) => (
                      <option key={profile.name} value={profile.name}>
                        {profile.stage_name ||
                          profile.employee_name ||
                          profile.name}
                        {profile.current_rank
                          ? ` · ${profile.current_rank}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <small>
                    Энэ үйлдэл шинэ ажилтан эсвэл нэвтрэх эрх үүсгэхгүй.
                  </small>
                </label>
              ) : null}

              {requiresReason ? (
                <label className="decision-reason">
                  <span>Шалтгаан</span>
                  <textarea
                    value={note}
                    onChange={(event) => {
                      setNote(event.target.value);
                      setError("");
                    }}
                    placeholder={
                      decision === "Staff"
                        ? "Жишээ: Sapphire салбарын зөөгч"
                        : "Жишээ: Ажлаас гарсан"
                    }
                  />
                  <small>Тодорхой тайлбар бичнэ үү.</small>
                </label>
              ) : null}
            </fieldset>

            <details className="candidate-source-detail">
              <summary>Эх мэдээлэл</summary>
              <div>
                <p>
                  {row.observed_branches || "Салбарын мэдээлэл бүртгэгдээгүй"}
                </p>
                <small>Анх бүртгэгдсэн: {dateLabel(row.first_seen)}</small>
                <small>Бүртгэлийн ID: {row.finex_dancer_id}</small>
              </div>
            </details>
          </div>
          {error ? (
            <p className="candidate-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="candidate-save-row">
            <button
              type="button"
              className="candidate-cancel"
              onClick={() => {
                setExpanded(false);
                setDecision(undefined);
                setLinkedProfile(row.linked_profile || "");
                setNote("");
                setError("");
              }}
              disabled={busy}
            >
              Болих
            </button>
            <button
              type="button"
              className="candidate-save"
              disabled={busy || !canSave}
              onClick={saveDecision}
            >
              <Save />
              {busy ? "Хадгалж байна…" : "Шийдвэр хадгалах"}
            </button>
          </div>
        </div>
      ) : null}

      {row.review_status !== "Pending" && !expanded ? (
        <div className={`reviewed-result ${needsLink ? "needs-link" : ""}`}>
          {needsLink ? <AlertTriangle /> : <Check />}
          <span>
            <strong>
              {needsLink ? "Баталгаатай ажилтантай холбоогүй" : reviewedLabel}
            </strong>
            <small>
              {needsLink
                ? "Импортын хуваарь харахын тулд профайл сонгоно уу."
                : row.review_note ||
                  `Профайл: ${row.linked_profile || "шийдвэр хадгалагдсан"}`}
            </small>
          </span>
        </div>
      ) : null}
    </article>
  );
}

export function ManagerRosterReview({ onBack }: { onBack: () => void }) {
  const [status, setStatus] = useState<ReviewStatus>("Pending");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<RosterCandidateData>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    return () => {
      requestSequence.current += 1;
    };
  }, []);

  const load = useCallback(
    async (cursor = 0, append = false) => {
      const requestId = ++requestSequence.current;
      setLoading(!append);
      setLoadingMore(append);
      setError("");
      try {
        const next = await api.managerRosterCandidates(
          status,
          search.trim(),
          cursor,
        );
        if (requestId !== requestSequence.current) return;
        setData((current) =>
          append && current
            ? {
                ...next,
                candidates: [...current.candidates, ...next.candidates],
              }
            : next,
        );
      } catch (err) {
        if (requestId !== requestSequence.current) return;
        setError(
          err instanceof Error ? err.message : "Жагсаалтыг ачаалж чадсангүй.",
        );
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [search, status],
  );

  useEffect(() => {
    void load(0, false);
  }, [load]);

  const statusCounts: Partial<Record<ReviewStatus, number>> = data
    ? {
        Pending: data.summary.pending,
        Entertainer: data.summary.entertainer,
        Staff: data.summary.staff,
        Inactive: data.summary.inactive,
        All: data.summary.total,
      }
    : {};

  return (
    <div
      className={`roster-review-page ${loading ? "is-loading" : ""}`}
      aria-busy={loading}
    >
      <button className="back-link" type="button" onClick={onBack}>
        <ArrowLeft />
        Ажилтны жагсаалт
      </button>

      <header className="roster-review-title">
        <div>
          <h1>Бүртгэлгүй нэрсийг шалгах</h1>
          <p>
            Баталгаажсан ажилтны жагсаалтад таараагүй нэр бүрийн төрлийг
            сонгоно. Шинэ ажилтан, нэвтрэх эрх автоматаар үүсэхгүй.
          </p>
        </div>
        {data ? (
          <div className="review-queue-count">
            <strong>{data.summary.pending}</strong>
            <span>шалгах нэр</span>
          </div>
        ) : null}
      </header>

      <nav className="candidate-tabs" aria-label="Ангиллын төлөв">
        {STATUS_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={status === option.value ? "active" : ""}
            aria-current={status === option.value ? "page" : undefined}
            onClick={() => setStatus(option.value)}
          >
            <span>{option.label}</span>
            {statusCounts[option.value] !== undefined ? (
              <b>{statusCounts[option.value]}</b>
            ) : null}
          </button>
        ))}
      </nav>

      <form
        className="candidate-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label>
          <Search />
          <span className="sr-only">Нэр хайх</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Нэр эсвэл бүртгэлийн ID-аар хайх"
          />
        </label>
        <button type="submit" aria-label="Жагсаалт шинэчлэх" disabled={loading}>
          <RefreshCw className={loading ? "spin" : ""} />
        </button>
      </form>

      {error ? (
        <div className="form-error" role="alert">
          {error}
        </div>
      ) : null}
      {loading && !data ? (
        <div className="roster-loading">
          <RefreshCw className="spin" />
          Жагсаалт ачаалж байна…
        </div>
      ) : null}
      {!loading && data?.candidates.length === 0 ? (
        <div className="roster-empty">
          <UserCheck />
          <strong>
            {status === "Pending"
              ? "Шалгах нэр үлдээгүй"
              : "Энэ ангилалд нэр алга"}
          </strong>
        </div>
      ) : null}
      {data?.candidates.length ? (
        <section
          className="candidate-table"
          aria-label="Бүртгэлгүй нэрсийн жагсаалт"
        >
          <div className="candidate-table-head" aria-hidden="true">
            <span>Нэр / Бүртгэлийн ID</span>
            <span>Баримт</span>
            <span>Сүүлд бүртгэгдсэн</span>
            <span>Таамагласан салбар</span>
            <span>Шийдвэр</span>
          </div>
          <div className="candidate-list">
            {data.candidates.map((row) => (
              <CandidateRow
                key={row.name}
                row={row}
                profiles={data.profiles}
                onReviewed={() => {
                  void load(0, false);
                }}
              />
            ))}
          </div>
          {data.meta.next_cursor !== null ? (
            <button
              type="button"
              className="candidate-load-more"
              disabled={loadingMore}
              onClick={() => {
                void load(data.meta.next_cursor || 0, true);
              }}
            >
              {loadingMore
                ? "Нэмж ачаалж байна…"
                : `Дараагийн нэрсийг харах · ${data.candidates.length}/${data.meta.total}`}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
