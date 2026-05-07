import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  ProfileWithDepartment,
  UserRole,
} from '@/types/database'

const USERS_KEY = ['users'] as const

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async (): Promise<ProfileWithDepartment[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:department_id(name, color_class)
        `)
        .order('full_name')
      if (error) throw error
      return (data ?? []) as unknown as ProfileWithDepartment[]
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
  department_id?: string | null
}

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
