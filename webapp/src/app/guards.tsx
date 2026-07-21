import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '~/store/session-store'
import type { UserRole } from '~/types/domain'

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: UserRole[]
  children: React.ReactNode
}) {
  const user = useSessionStore((state) => state.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}

