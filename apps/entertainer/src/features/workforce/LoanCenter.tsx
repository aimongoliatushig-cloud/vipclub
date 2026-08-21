import { HandCoins } from 'lucide-react'

import './LoanCenter.css'

export function EntertainerLoanCenter({ branch }: { branch: string }) {
  return <section className="loan-center" aria-labelledby="loan-title">
    <header className="loan-hero">
      <span aria-hidden="true"><HandCoins /></span>
      <div>
        <small>{branch.toUpperCase()} САЛБАР</small>
        <h1 id="loan-title">Зээл</h1>
        <p>Зээлийн үйлчилгээ бэлэн болмогц энд нээгдэнэ.</p>
      </div>
      <em>Тун удахгүй</em>
    </header>
  </section>
}
