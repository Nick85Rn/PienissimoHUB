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
import EmbedSettings from '@/pages/EmbedSettings'
import EmbedView from '@/pages/EmbedView'

export default function App() {
  const { session, loading, isAdmin, isMaster } = useAuth()

  return (
    <Routes>
      {/*
       * Rotta /embed pubblica, fuori dal flusso auth.
       * Viene caricata in iframe dal backoffice e l'autorizzazione
       * avviene tramite access_key nel query string.
       */}
      <Route path="/embed" element={<EmbedView />} />

      {/* Tutto il resto è protetto da login */}
      <Route
        path="*"
        element={
          <ProtectedApp
            session={session}
            loading={loading}
            isAdmin={isAdmin}
            isMaster={isMaster}
          />
        }
      />
    </Routes>
  )
}

function ProtectedApp({
  session,
  loading,
  isAdmin,
  isMaster,
}: {
  session: unknown
  loading: boolean
  isAdmin: boolean
  isMaster: boolean
}) {
  if (loading) return <PageLoader />

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

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
          path="/admin/embed"
          element={
            <AdminGuard isAdmin={isAdmin}>
              <EmbedSettings />
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
