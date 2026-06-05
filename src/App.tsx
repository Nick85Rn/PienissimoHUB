import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from '@/components/Spinner'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import TaskDetail from '@/pages/TaskDetail'
import NewTask from '@/pages/NewTask'
import EditTask from '@/pages/EditTask'
import Settings from '@/pages/Settings'
import AdminCategories from '@/pages/AdminCategories'
import AdminDepartments from '@/pages/AdminDepartments'
import AdminUsers from '@/pages/AdminUsers'
import EmailSettings from '@/pages/EmailSettings'

export default function App() {
  const { session, loading, isAdmin, isMaster } = useAuth()

  if (loading) return <PageLoader />

  // Utente non loggato: accede solo a /login
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Utente loggato
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/task/:id" element={<TaskDetail />} />
        <Route path="/settings" element={<Settings />} />

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
          path="/admin/departments"
          element={
            <AdminGuard isAdmin={isAdmin}>
              <AdminDepartments />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/email-settings"
          element={
            <AdminGuard isAdmin={isAdmin}>
              <EmailSettings />
            </AdminGuard>
          }
        />
        <Route
          path="/admin/users"
          element={
            <MasterGuard isMaster={isMaster}>
              <AdminUsers />
            </MasterGuard>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function AdminGuard({
  isAdmin,
  children,
}: {
  isAdmin: boolean
  children: React.ReactNode
}) {
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function MasterGuard({
  isMaster,
  children,
}: {
  isMaster: boolean
  children: React.ReactNode
}) {
  if (!isMaster) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
