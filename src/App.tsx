import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

const PROFILE_WAIT_MS = 4000

export default function App() {
  const { session, profile, loading, isAdmin } = useAuth()

  // Se siamo loggati ma il profilo non è ancora arrivato, aspettiamo
  // un po' (di solito è istantaneo). Se dopo X secondi non c'è ancora,
  // mostriamo un fallback con possibilità di riprovare.
  const [profileTimeout, setProfileTimeout] = useState(false)
  useEffect(() => {
    if (session && !profile && !loading) {
      const t = setTimeout(() => setProfileTimeout(true), PROFILE_WAIT_MS)
      return () => clearTimeout(t)
    }
    setProfileTimeout(false)
    return undefined
  }, [session, profile, loading])

  // Caricamento iniziale (dura al massimo 5s grazie al timeout in AuthContext)
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

  // Loggato ma profilo non ancora caricato
  if (!profile) {
    if (profileTimeout) return <ProfileError />
    return <PageLoader />
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />

      <Route element={<Layout />}>
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

/**
 * Fallback quando il profilo non riesce a caricare. Permette di
 * riprovare o di fare logout per uscire dal loop.
 */
function ProfileError() {
  const { signOut } = useAuth()
  const handleReload = () => window.location.reload()
  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          Sessione non recuperata
        </h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Non sono riuscito a caricare il tuo profilo. Può capitare per un
          problema temporaneo di rete o se il tuo profilo è stato modificato.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleReload}
            className="px-4 py-2 bg-pienissimo-blue text-white rounded-lg text-sm font-semibold hover:bg-pienissimo-dark transition-colors"
          >
            Riprova
          </button>
          <button
            onClick={() => void handleLogout()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Esci e ricomincia
          </button>
        </div>
      </div>
    </div>
  )
}
