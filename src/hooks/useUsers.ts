import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole, Department } from '@/types/database'

const USERS_KEY = ['users'] as const

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

interface ManageUserPayload {
  action: 'create' | 'update' | 'delete'
  user_id?: string
  email?: string
  password?: string
  full_name?: string
  role?: UserRole
  department?: Department
}

/**
 * Wrapper attorno alla Edge Function admin-update-user.
 * Tutte le operazioni sensibili (create/update credenziali/delete utente)
 * passano da qui, NON da supabase.auth.admin (che richiederebbe la
 * service_role key nel frontend = vietato).
 */
export function useManageUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ManageUserPayload) => {
      const { data, error } = await supabase.functions.invoke(
        'admin-update-user',
        { body: payload }
      )
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}
