import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from '@/components/Spinner'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import NewTask from '@/pages/NewTask'
import EditTask from '@/pages/EditTask'
import TaskDetail from '@/pages/TaskDetail'
import AdminCategories from '@/pages/AdminCategories'
import AdminUsers from '@/pages/AdminUsers'
import Settings from '@/pages/Settings'

export default function App() {
  const { session, profile, loading, isAdmin } = useAuth()

  if (loading) return <PageLoader />

  // Non loggato: solo /login
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Loggato ma profilo non ancora caricato (es. trigger lento)
  if (!profile) return <PageLoader />

  return (
    <Routes>
      {/* Login già loggato → redirect a dashboard */}
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />

      {/* Tutto il resto dentro il layout */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/task/:id" element={<TaskDetail />} />
        <Route path="/settings" element={<Settings />} />

        {/* Rotte admin-only */}
        <Route
          path="/new-task"
          element={
            <AdminGuard isAdmin={isAdmin}>
              <NewTask />
            </AdminGuard>
          }
        />
        <Route
          path="/edit-task/:id"
          element={
            <AdminGuard isAdmin={isAdmin}>
              <EditTask />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminGuard isAdmin={isAdmin}>
              <AdminCategories />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminGuard isAdmin={isAdmin}>
              <AdminUsers />
            </AdminGuard>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

/**
 * Guard di rotta: se l'utente non è admin, lo manda al dashboard.
 * NOTA: il vero gating è sulle RLS Supabase. Questo è solo UX.
 */
function AdminGuard({
  isAdmin,
  children,
}: {
  isAdmin: boolean
  children: React.ReactNode
}) {
  const location = useLocation()
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />
  }
  return <>{children}</>
}
