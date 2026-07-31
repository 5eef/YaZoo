import { Navigate, Outlet } from 'react-router'

import { useAuth } from '../../hooks/useAuth'

export default function AdminRoute() {
  const { isAuthenticated, isBootstrapping, user } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="flex min-h-48 items-center justify-center" role="status" aria-live="polite">
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        <span className="sr-only">Chargement de l’espace administrateur</span>
      </div>
    )
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return <Navigate to="/feed" replace />
  }

  return <Outlet />
}
