import { useState } from "react";
import { AlertTriangle, BellRing, ChevronRight, RefreshCw, UserRoundCheck } from "lucide-react";
import { rotation, teamMembers, type TeamMember } from "./model";
import { PageHeader, SegmentedControl, StatusMark } from "./ui";

type TeamMode = "status" | "rotation";

const statusOrder: TeamMember["status"][] = ["Боломжтой", "Тайзан дээр", "VIP үйлчилгээ", "Завсарлага", "Ирээгүй"];

export function TeamScreen({ onBack, onException }: { onBack: () => void; onException: () => void }) {
  const [mode, setMode] = useState<TeamMode>("status");
  return (
    <div className="ops-screen ops-team-screen" data-screen="team">
      <PageHeader title="Багийн ээлж" subtitle="Nomad" onBack={onBack} />
      <div className="ops-team-summary" aria-label="Багийн ээлжийн төлөв">
        <span><i className="is-success" />12 ажиллаж байна</span>
        <span><i className="is-warning" />1 анхаарах зүйл</span>
      </div>
      <section className="ops-team-alert" aria-labelledby="team-alert-title">
        <h2 id="team-alert-title">Одоо анхаарах</h2>
        <button type="button" onClick={onException}>
          <AlertTriangle aria-hidden="true" />
          <span><strong>VIP 05 · Хариулаагүй хүсэлт</strong><small>00:42 үлдсэн</small></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </section>
      <SegmentedControl
        label="Багийн харагдац"
        value={mode}
        options={[{ value: "status", label: "Төлөв" }, { value: "rotation", label: "Тайзны дараалал" }]}
        onChange={setMode}
      />
      {mode === "status" ? <TeamStatusList /> : <RotationList />}
    </div>
  );
}

function TeamStatusList() {
  return (
    <div className="ops-team-groups">
      {statusOrder.map((status) => {
        const members = teamMembers.filter((member) => member.status === status);
        if (!members.length) return null;
        return (
          <section key={status} aria-labelledby={`team-${status}`}>
            <h2 id={`team-${status}`}>{status} · {members.length}</h2>
            <div className="ops-team-rows">
              {members.map((member) => (
                <div key={member.name}>
                  <StatusMark status={member.status} />
                  <span><strong>{member.name}</strong><small>{member.detail}</small></span>
                  {member.timer ? <time>{member.timer}</time> : null}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RotationList() {
  return (
    <section className="ops-rotation" aria-labelledby="rotation-title">
      <div className="ops-section-heading"><h2 id="rotation-title">Үндсэн тайз</h2><span>Шууд дараалал</span></div>
      <ol>
        {rotation.map((item) => (
          <li key={`${item.order}-${item.name}`} className={`is-${item.state}`}>
            <span className="ops-rotation-order">{item.order}</span>
            <span><strong>{item.name}</strong><small>{item.detail}</small></span>
            {item.timer ? <time>{item.timer}</time> : null}
          </li>
        ))}
      </ol>
      <p className="ops-sync-note"><RefreshCw aria-hidden="true" /> Сүүлд шинэчилсэн · Одоо</p>
    </section>
  );
}

export function TeamExceptionScreen({ onBack, onRemind, onReassign }: { onBack: () => void; onRemind: () => void; onReassign: () => void }) {
  return (
    <div className="ops-screen" data-screen="team-exception">
      <PageHeader title="Хариулаагүй хүсэлт" onBack={onBack} />
      <section className="ops-exception-hero">
        <AlertTriangle aria-hidden="true" />
        <small>00:42 үлдсэн</small>
        <h2>VIP 05 хүсэлтэд хариулаагүй</h2>
        <p>Хүсэлтийг Уянгад 21:58-д илгээсэн.</p>
      </section>
      <div className="ops-key-value-list" role="list">
        <KeyValue label="Байршил" value="VIP 05" />
        <KeyValue label="Үргэлжлэх хугацаа" value="1 цаг" />
        <KeyValue label="Одоогийн төлөв" value="Хариу хүлээж байна" />
        <KeyValue label="Дараагийн боломжтой" value="Ану · Боломжтой" />
      </div>
      <div className="ops-exception-actions">
        <button className="ops-primary-button" type="button" onClick={onRemind}><BellRing aria-hidden="true" /> Дахин сануулах</button>
        <button className="ops-secondary-button" type="button" onClick={onReassign}><UserRoundCheck aria-hidden="true" /> Өөр хүн санал болгох</button>
      </div>
      <p className="ops-privacy-note">Зөвхөн ээлж зохицуулахад хэрэгтэй төлөвийг харуулав.</p>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return <div className="ops-key-value" role="listitem"><span>{label}</span><strong>{value}</strong></div>;
}
