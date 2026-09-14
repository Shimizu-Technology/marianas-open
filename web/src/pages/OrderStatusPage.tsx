import { ArrowLeft, Loader2, Mail, PackageSearch, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEO from '../components/SEO'
import { api } from '../services/api'

const inputClass = 'mt-2 w-full rounded-xl border border-white/12 bg-black/20 px-4 py-3.5 text-base text-white outline-none transition placeholder:text-text-muted focus:border-gold/60 focus:ring-2 focus:ring-gold/15'

export default function OrderStatusPage() {
  const navigate = useNavigate()
  const [number, setNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!number.trim() || !email.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await api.lookupShopOrder(number.trim().toUpperCase(), email.trim().toLowerCase())
      navigate(`/shop/orders/${result.order_token}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not find that order.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-32 sm:px-6 sm:pt-36">
      <SEO title="Order Status" description="Check the status of your Marianas Open merchandise order." />
      <div className="mx-auto max-w-5xl">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to the shop</Link>
        <div className="mt-7 grid overflow-hidden rounded-3xl border border-white/10 bg-surface lg:grid-cols-[.9fr_1.1fr]">
          <section className="relative overflow-hidden border-b border-white/10 p-6 sm:p-9 lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(212,168,67,.15),transparent_45%)]" />
            <div className="relative">
              <PackageSearch className="h-11 w-11 text-gold" />
              <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-gold">Order status</p>
              <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">Find your merchandise order</h1>
              <p className="mt-4 leading-7 text-text-secondary">Enter the order number from your confirmation and the email used at checkout. We’ll take you to the latest payment and fulfillment status.</p>
              <div className="mt-7 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-text-secondary"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><p>For privacy, both details must match. We show the same generic message when they do not.</p></div>
            </div>
          </section>

          <form onSubmit={event => void submit(event)} className="p-6 sm:p-9">
            <div>
              <label htmlFor="order-number" className="text-sm font-semibold">Order number</label>
              <input id="order-number" className={inputClass} autoComplete="off" spellCheck={false} placeholder="MO-20260915-AB12CD34" value={number} onChange={event => setNumber(event.target.value.toUpperCase())} />
              <p className="mt-2 text-xs text-text-muted">You’ll find this near the top of your confirmation.</p>
            </div>
            <div className="mt-6">
              <label htmlFor="order-email" className="text-sm font-semibold">Checkout email</label>
              <div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-text-muted" /><input id="order-email" type="email" autoComplete="email" className={`${inputClass} pl-11`} placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} /></div>
            </div>
            {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">{error}</div>}
            <button type="submit" disabled={loading || !number.trim() || !email.trim()} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-45">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Finding your order…</> : 'Check order status'}</button>
            <p className="mt-5 text-center text-xs leading-5 text-text-muted">Still need help? Contact <a href="mailto:moguam@marianasopen.com" className="text-gold hover:text-gold-300">moguam@marianasopen.com</a>.</p>
          </form>
        </div>
      </div>
    </div>
  )
}
