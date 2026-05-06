import { useState } from 'react'
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      // App.tsx redirige automaticamente quando session cambia
    } catch (err) {
      setError(
        err instanceof Error
          ? 'Credenziali non valide. Verifica email e password.'
          : 'Errore sconosciuto'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-pienissimo-blue text-white grid place-items-center font-black text-2xl mb-4 shadow-lg shadow-pienissimo-blue/20">
          P
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Pienissimo Hub
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Accedi al workspace interno
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={(e) => void handleLogin(e)}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Email aziendale
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-3.5 text-slate-400"
                  size={18}
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-3.5 text-slate-400"
                  size={18}
                />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pienissimo-blue/20 focus:border-pienissimo-blue text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-pienissimo-blue hover:bg-pienissimo-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pienissimo-blue disabled:opacity-50 transition-colors"
            >
              {loading ? 'Accesso in corso...' : 'Entra nel workspace'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed">
            Solo gli utenti autorizzati possono accedere a questo strumento.
            <br />
            Per ricevere le credenziali contatta un amministratore.
          </p>
        </div>
      </div>
    </div>
  )
}
