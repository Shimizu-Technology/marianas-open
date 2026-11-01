import { SignIn, SignUp } from '@clerk/clerk-react'
import { useLocation } from 'react-router-dom'

export default function AdminSignIn() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const acceptingInvite = !!params.get('__clerk_ticket') && params.get('__clerk_status') === 'sign_up'
  const appearance = {
    elements: {
      rootBox: 'mx-auto w-full max-w-sm',
      cardBox: 'w-full',
      card: 'w-full shadow-2xl',
      footerAction: { display: 'none' },
    },
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4 py-12">
      <div className="w-full max-w-sm">
        {acceptingInvite ? (
          <SignUp routing="hash" forceRedirectUrl="/admin" appearance={appearance} />
        ) : (
          <SignIn routing="hash" withSignUp={false} forceRedirectUrl="/admin" appearance={appearance} />
        )}
        <p className="mt-5 text-center text-sm leading-relaxed text-text-secondary">
          Admin access is invite-only. Use the link in your invitation email.
        </p>
      </div>
    </div>
  )
}
