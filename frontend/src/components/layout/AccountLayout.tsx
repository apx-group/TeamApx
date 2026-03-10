import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="account-page">
      <Sidebar />
      <div className="account-page-body">
        {children}
      </div>
    </div>
  )
}
