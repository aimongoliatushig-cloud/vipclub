import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  HandCoins,
  Landmark,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { formatMoney, loanPolicy, type LoanRequest } from "./model";
import { PageHeader } from "./ui";

export function LoanScreen({
  request,
  onBack,
  onSubmit,
}: {
  request: LoanRequest | null;
  onBack: () => void;
  onSubmit: (request: LoanRequest) => void;
}) {
  const [amount, setAmount] = useState("");
  const [repaymentRate, setRepaymentRate] = useState("20");
  const [purpose, setPurpose] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const numericAmount = Number(amount);
  const amountValid = Number.isFinite(numericAmount)
    && numericAmount > 0
    && numericAmount <= loanPolicy.maximumAmount
    && numericAmount % loanPolicy.amountStep === 0;
  const rateValid = loanPolicy.repaymentRates.includes(Number(repaymentRate) as 10 | 15 | 20 | 25 | 30);
  const canSubmit = amountValid && rateValid && purpose.trim().length > 0 && acceptedTerms;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      amount: numericAmount,
      repaymentRate: Number(repaymentRate),
      purpose: purpose.trim(),
      requestedAt: "Өнөөдөр · дөнгөж сая",
      status: "Шийдвэр хүлээж байна",
    });
  };

  return (
    <div className="ops-screen ops-loan-screen" data-screen="loan">
      <PageHeader title="Зээл" subtitle="Лимит, нөхцөл, хүсэлтийн явц" onBack={onBack} />

      <section className="ops-loan-hero" aria-labelledby="loan-limit-title">
        <span className="ops-loan-hero-icon" aria-hidden="true"><HandCoins /></span>
        <span className="ops-loan-open"><ShieldCheck aria-hidden="true" /> Хүсэлт нээлттэй</span>
        <small id="loan-limit-title">Хүсэх дээд дүн</small>
        <strong>{formatMoney(loanPolicy.maximumAmount)}</strong>
        <p>Хүсэлт илгээснээр зээл шууд олгогдохгүй. Шийдвэрийн төлөв энэ дэлгэц дээр шинэчлэгдэнэ.</p>
      </section>

      <section className="ops-loan-facts" aria-label="Зээлийн товч мэдээлэл">
        <article>
          <WalletCards aria-hidden="true" />
          <span><small>Одоогийн үлдэгдэл</small><strong>{formatMoney(loanPolicy.outstandingBalance)}</strong></span>
        </article>
        <article>
          <Landmark aria-hidden="true" />
          <span><small>Эргэн төлөх хувь</small><strong>10–30%</strong></span>
        </article>
        <article>
          <Clock3 aria-hidden="true" />
          <span><small>Төлөлтийн эх үүсвэр</small><strong>Баталгаажсан орлого</strong></span>
        </article>
      </section>

      {request ? (
        <section className="ops-loan-request-status" aria-labelledby="loan-request-status-title">
          <CheckCircle2 aria-hidden="true" />
          <span>
            <small id="loan-request-status-title">Миний хүсэлт</small>
            <strong>{formatMoney(request.amount)} · {request.repaymentRate}%</strong>
            <p>{request.requestedAt} · {request.purpose}</p>
          </span>
          <b>{request.status}</b>
        </section>
      ) : (
        <form className="ops-loan-form" onSubmit={submit}>
          <header>
            <h2>Зээлийн хүсэлт илгээх</h2>
            <p>Дүн, эргэн төлөх хувь, зориулалтаа оруулна.</p>
          </header>

          <label>
            <span>Хүсэх дүн <small>Дээд тал нь {formatMoney(loanPolicy.maximumAmount)}</small></span>
            <input
              type="number"
              inputMode="numeric"
              min={loanPolicy.amountStep}
              max={loanPolicy.maximumAmount}
              step={loanPolicy.amountStep}
              placeholder="Жишээ: 500000"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={amount !== "" && !amountValid}
              aria-describedby="loan-amount-hint"
              required
            />
            <small id="loan-amount-hint">{amount !== "" && !amountValid ? "₮50,000-ын алхмаар, дээд дүнгээс хэтрэхгүй оруулна." : "₮50,000-ын алхмаар сонгоно."}</small>
          </label>

          <label>
            <span>Эргэн төлөх хувь <small>Орлогоос суутгах хувь</small></span>
            <select value={repaymentRate} onChange={(event) => setRepaymentRate(event.target.value)} required>
              {loanPolicy.repaymentRates.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
            </select>
          </label>

          <label>
            <span>Зээлийн зориулалт</span>
            <textarea
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Юунд зарцуулахаа товч бичнэ үү"
              required
            />
          </label>

          <details className="ops-loan-disclosure">
            <summary>Зээлийн нөхцөлийг харах</summary>
            <ul>
              <li>Хүсэх дүн {formatMoney(loanPolicy.maximumAmount)}-өөс хэтрэхгүй.</li>
              <li>Сонгосон хувийг баталгаажсан орлогоос эргэн төлөх тооцоонд ашиглана.</li>
              <li>Хүсэлт илгээснээр зээл шууд олгогдохгүй.</li>
            </ul>
          </details>

          <label className="ops-loan-consent">
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
            <span>Оруулсан мэдээлэл зөв бөгөөд зээлийн нөхцөлийг уншиж зөвшөөрсөн.</span>
          </label>

          <button className="ops-primary-button" type="submit" disabled={!canSubmit}>
            <Send aria-hidden="true" /> Хүсэлт илгээх
          </button>
        </form>
      )}
    </div>
  );
}
