import type { ReactNode } from 'react'

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="account-page">
      <div className="account-page-body">
        {children}
      </div>
    </div>
  )
}
