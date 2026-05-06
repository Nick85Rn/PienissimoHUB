import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  LogOut,
  FilePlus,
  Users,
  Tag,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn, initialsOf } from '@/lib/utils'
import { DEPARTMENT_LABELS } from '@/types/database'
import { ZohoChat } from './ZohoChat'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, isAdmin, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-20 flex items-center justify-center px-6 border-b border-slate-100 shrink-0">
          <img
            src="/logo.png"
            alt="Pienissimo PRO"
            className="h-7 w-auto"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-6">
          <SidebarSection title="Bacheca">
            <SidebarLink
              to="/dashboard"
              icon={<LayoutDashboard size={18} />}
              active={location.pathname === '/dashboard'}
            >
              Tutti i task
            </SidebarLink>
            {isAdmin && (
              <SidebarLink
                to="/new-task"
                icon={<FilePlus size={18} />}
                active={location.pathname === '/new-task'}
              >
                Nuovo task
              </SidebarLink>
            )}
          </SidebarSection>

          {isAdmin && (
            <SidebarSection title="Amministrazione">
              <SidebarLink
                to="/admin/categories"
                icon={<Tag size={18} />}
                active={location.pathname === '/admin/categories'}
              >
                Categorie
              </SidebarLink>
              <SidebarLink
                to="/admin/users"
                icon={<Users size={18} />}
                active={location.pathname === '/admin/users'}
              >
                Utenti
              </SidebarLink>
            </SidebarSection>
          )}

          <SidebarSection title="Sistema">
            <SidebarLink
              to="/settings"
              icon={<SettingsIcon size={18} />}
              active={location.pathname === '/settings'}
            >
              Profilo
            </SidebarLink>
          </SidebarSection>
        </nav>

        {/* User card */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg">
            <div
              className={cn(
                'w-9 h-9 rounded-full grid place-items-center font-bold text-xs shrink-0',
                isAdmin
                  ? 'bg-pienissimo-blue text-white'
                  : 'bg-slate-200 text-slate-700'
              )}
            >
              {initialsOf(profile?.full_name ?? '')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {profile?.full_name ?? 'Utente'}
              </p>
              <div className="flex items-center gap-1.5">
                {isAdmin && (
                  <ShieldCheck size={11} className="text-pienissimo-blue" />
                )}
                <p className="text-xs text-slate-500 truncate">
                  {isAdmin
                    ? 'Admin'
                    : profile
                      ? DEPARTMENT_LABELS[profile.department]
                      : ''}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            Esci
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <ZohoChat />
    </div>
  )
}

function SidebarSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="px-4">
      <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function SidebarLink({
  to,
  icon,
  active,
  children,
}: {
  to: string
  icon: React.ReactNode
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
        active
          ? 'bg-pienissimo-50 text-pienissimo-blue'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      <span
        className={cn(
          'shrink-0',
          active ? 'text-pienissimo-blue' : 'text-slate-400'
        )}
      >
        {icon}
      </span>
      {children}
    </Link>
  )
}
