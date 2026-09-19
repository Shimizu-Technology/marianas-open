import { FlaskConical } from 'lucide-react'

export default function CommerceDemoNotice({ className = '' }: { className?: string }) {
  return (
    <div role="note" className={`flex gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.08] p-4 text-amber-100 ${className}`}>
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Shop preview — no real purchases</p>
        <p className="mt-1 text-sm leading-6 text-amber-100/85">Products, shipping prices, payments, refunds, and labels here are simulated. Nothing will be charged, shipped, or reserved for pickup. Please use sample contact details.</p>
      </div>
    </div>
  )
}
