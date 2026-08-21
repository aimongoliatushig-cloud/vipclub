import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Save,
  TrendingUp,
} from "lucide-react";
import { api, idempotencyKey } from "../../api";
import type { ManagerSettings as ManagerSettingsData } from "../../api";
import "./ManagerSettings.css";

const money = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 });
const timeValue = (value?: string | null) => String(value || "22:00").slice(0, 5);

export function ManagerSettingsPage({ branch }: { branch: string }) {
  const [data, setData] = useState<ManagerSettingsData>();
  const [salesAmount, setSalesAmount] = useState("");
  const [lateAfterTime, setLateAfterTime] = useState("22:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const requestKey = useRef(idempotencyKey("manager-settings"));

  const apply = useCallback((value: ManagerSettingsData) => {
    setData(value);
    setSalesAmount(value.sales.full_score_amount > 0 ? String(value.sales.full_score_amount) : "");
    setLateAfterTime(timeValue(value.attendance.late_after_time));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      apply(await api.managerSettings());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Тохиргоог ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const amount = Number(salesAmount || 0);
  const dirty = Boolean(data) && (
    amount !== Number(data?.sales.full_score_amount || 0)
    || lateAfterTime !== timeValue(data?.attendance.late_after_time)
  );
  const valid = amount > 0 && amount <= 1_000_000_000 && Boolean(lateAfterTime) && reason.trim().length >= 3;
  const halfAmount = useMemo(() => amount > 0 ? Math.round(amount / 2) : 0, [amount]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data || !dirty || !valid || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const value = await api.updateManagerSettings({
        sales_full_score_amount: amount,
        late_after_time: lateAfterTime,
        reason: reason.trim(),
        expected_modified: data.modified,
      }, requestKey.current);
      apply(value);
      setReason("");
      setMessage("Тохиргоо хадгалагдлаа.");
      requestKey.current = idempotencyKey("manager-settings");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Тохиргоог хадгалж чадсангүй.");
      requestKey.current = idempotencyKey("manager-settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="manager-settings-page">
      <header className="manager-settings-heading">
        <div>
          <span>{branch}</span>
          <h1>Тохиргоо</h1>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || saving} aria-label="Тохиргоо шинэчлэх">
          <RefreshCw className={loading ? "spin" : ""} />
        </button>
      </header>

      {error ? <p className="manager-settings-notice error" role="alert"><AlertTriangle />{error}</p> : null}
      {message ? <p className="manager-settings-notice success" role="status"><CheckCircle2 />{message}</p> : null}

      {loading && !data ? (
        <div className="manager-settings-loading"><RefreshCw className="spin" />Тохиргоо ачаалж байна…</div>
      ) : (
        <form className="manager-settings-form" onSubmit={submit}>
          <section className="manager-settings-section" aria-labelledby="sales-score-setting">
            <header>
              <TrendingUp />
              <div>
                <h2 id="sales-score-setting">Борлуулалтын оноо</h2>
                <p>Бүтэн оноо авах өдрийн борлуулалтын дүн.</p>
              </div>
              <strong>{data?.sales.weight || 40} оноо</strong>
            </header>
            <label>
              <span>Бүтэн онооны босго</span>
              <span className="manager-money-input">
                <input
                  inputMode="numeric"
                  type="number"
                  min="10000"
                  max="1000000000"
                  step="10000"
                  value={salesAmount}
                  onChange={(event) => setSalesAmount(event.target.value)}
                  placeholder="Жишээ: 4000000"
                  required
                />
                <b>₮</b>
              </span>
            </label>
            {amount > 0 ? (
              <div className="manager-score-preview" aria-label="Борлуулалтын онооны жишээ">
                <span><b>{money.format(halfAmount)} ₮</b><small>20 оноо</small></span>
                <span><b>{money.format(amount)} ₮</b><small>{data?.sales.weight || 40} оноо</small></span>
              </div>
            ) : (
              <p className="manager-setting-hint">Босгыг тохируулсны дараа борлуулалтын оноо автоматаар хувь тэнцэнэ.</p>
            )}
          </section>

          <section className="manager-settings-section" aria-labelledby="attendance-time-setting">
            <header>
              <Clock3 />
              <div>
                <h2 id="attendance-time-setting">Ирцийн цаг</h2>
                <p>Энэ цагаас хойш хоцролтод тооцно.</p>
              </div>
            </header>
            <label>
              <span>Хоцролт эхлэх цаг</span>
              <input type="time" value={lateAfterTime} onChange={(event) => setLateAfterTime(event.target.value)} required />
            </label>
          </section>

          {dirty ? (
            <section className="manager-settings-save">
              <label>
                <span>Өөрчилсөн шалтгаан</span>
                <input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} placeholder="Товч шалтгаан" required />
              </label>
              <button type="submit" disabled={!valid || saving}>
                {saving ? <RefreshCw className="spin" /> : <Save />}
                {saving ? "Хадгалж байна…" : "Хадгалах"}
              </button>
            </section>
          ) : null}
        </form>
      )}
    </main>
  );
}
