// Edge Function: admin-manage-user
// =====================================================================
// Permette agli admin di creare, modificare credenziali e cancellare
// utenti. Verifica che il chiamante sia admin prima di agire.
//
// Deploy: supabase functions deploy admin-manage-user
// Set secret: supabase secrets set SERVICE_ROLE_KEY=<la-tua-service-role-key>
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CreateUserPayload {
  action: 'create'
  email: string
  password: string
  full_name: string
  role: 'admin' | 'guest'
  department: string
}

interface UpdateUserPayload {
  action: 'update'
  user_id: string
  email?: string
  password?: string
  full_name?: string
  role?: 'admin' | 'guest'
  department?: string
}

interface DeleteUserPayload {
  action: 'delete'
  user_id: string
}

type Payload = CreateUserPayload | UpdateUserPayload | DeleteUserPayload

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ---- 1. Verifica auth del chiamante ----
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid session' }, 401)
    }

    // ---- 2. Verifica che il chiamante sia admin ----
    const { data: profile, error: profileError } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return jsonResponse({ error: 'Forbidden: admin only' }, 403)
    }

    // ---- 3. Esegui l'operazione richiesta con la service_role ----
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!
    )

    const payload = (await req.json()) as Payload

    switch (payload.action) {
      case 'create': {
        const { email, password, full_name, role, department } = payload
        if (!email || !password || password.length < 8) {
          return jsonResponse(
            { error: 'Email e password (min 8 caratteri) obbligatorie' },
            400
          )
        }

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // skip email confirm per uso interno
          user_metadata: { full_name, role, department },
        })

        if (error) return jsonResponse({ error: error.message }, 400)

        // il trigger handle_new_user crea automaticamente il profilo
        return jsonResponse({ user: data.user })
      }

      case 'update': {
        const { user_id, email, password, full_name, role, department } =
          payload
        if (!user_id) return jsonResponse({ error: 'user_id richiesto' }, 400)

        // Aggiorna auth (email/password)
        const authUpdates: Record<string, string> = {}
        if (email) authUpdates.email = email
        if (password) {
          if (password.length < 8) {
            return jsonResponse({ error: 'Password troppo corta (min 8)' }, 400)
          }
          authUpdates.password = password
        }
        if (Object.keys(authUpdates).length > 0) {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(
            user_id,
            authUpdates
          )
          if (error) return jsonResponse({ error: error.message }, 400)
        }

        // Aggiorna profilo
        const profileUpdates: Record<string, string> = {}
        if (full_name) profileUpdates.full_name = full_name
        if (role) profileUpdates.role = role
        if (department) profileUpdates.department = department
        if (email) profileUpdates.email = email

        if (Object.keys(profileUpdates).length > 0) {
          const { error } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdates)
            .eq('id', user_id)
          if (error) return jsonResponse({ error: error.message }, 400)
        }

        return jsonResponse({ ok: true })
      }

      case 'delete': {
        const { user_id } = payload
        if (!user_id) return jsonResponse({ error: 'user_id richiesto' }, 400)

        // Impedisce all'admin di cancellare sé stesso
        if (user_id === user.id) {
          return jsonResponse(
            { error: 'Non puoi cancellare il tuo stesso account' },
            400
          )
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
        if (error) return jsonResponse({ error: error.message }, 400)

        return jsonResponse({ ok: true })
      }

      default:
        return jsonResponse({ error: 'Action non valida' }, 400)
    }
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      500
    )
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
