import { Crown, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    window.setTimeout(() => {
      void signIn()
        .then(() => {
          const returnTo = typeof location.state?.returnTo === 'string' ? location.state.returnTo : '/'
          navigate(returnTo, { replace: true })
        })
        .catch(() => {
          setSubmitting(false)
          setError('Нэвтрэх мэдээллийг баталгаажуулж чадсангүй. Дахин оролдоно уу.')
        })
    }, 280)
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand"><Crown size={30} strokeWidth={1.7} aria-hidden="true" /><span>VIP CLUB</span></div>
        <div className="login-copy">
          <h1 id="login-title">Удирдлагын ажлын орчин</h1>
          <p>Хувийн эрхээр нэвтэрч, зөвшөөрөгдсөн салбар ба үйлдлүүдээ ашиглана.</p>
        </div>
        <form onSubmit={onSubmit} className="login-form">
          <label>
            <span>Утасны дугаар</span>
            <input name="username" inputMode="tel" placeholder="99112233" autoComplete="username" required />
          </label>
          <label>
            <span>Нууц үг</span>
            <span className="password-field">
              <input name="password" type={showPassword ? 'text' : 'password'} defaultValue="vip-club-demo" autoComplete="current-password" required />
              <button type="button" className="icon-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Нууц үг нуух' : 'Нууц үг харуулах'}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </span>
          </label>
          <button className="button button--primary button--full" type="submit" disabled={submitting}>
            {submitting ? 'Нэвтэрч байна…' : 'Нэвтрэх'}
          </button>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </form>
        <div className="login-security"><ShieldCheck size={18} aria-hidden="true" /><span>Demo session · Backend authorization integration pending</span></div>
      </section>
    </main>
  )
}
