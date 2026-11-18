import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { Alert, Select } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { queryKeys } from '@/lib/query/queryClient'
import { profileService } from '@/services'
import { ASSIGNABLE_ROLES, type UserRole } from '@/types/auth'
import { formatDate } from '@/lib/utils/format'

const ROLE_HELP: Record<UserRole, string> = {
  customer: 'No dashboard access.',
  shopkeeper: 'Retired role: no dashboard access. Change it to Admin or Customer.',
  admin: 'Everything, including deleting products and assigning roles.',
}

/** Admin only (route guard + public.set_user_role checks is_admin()). */
export default function UsersPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const users = useQuery({
    queryKey: queryKeys.admin.users(search),
    queryFn: () => profileService.list(search),
  })
  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => profileService.setRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  return (
    <>
      <AdminPageHeader
        title="Users & roles"
        description="Only admins can open the dashboard. Promote an account to Admin to give access, or set it back to Customer to remove it."
      />

      <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ASSIGNABLE_ROLES.map((r) => (
          <div key={r} className="rounded-sm border border-bone/10 p-4">
            <dt className="font-display text-xs tracking-wider text-sand uppercase">{r}</dt>
            <dd className="mt-1 text-xs text-ink-muted">{ROLE_HELP[r]}</dd>
          </div>
        ))}
      </dl>

      <label className="mb-6 flex h-11 max-w-md items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-3 focus-within:border-sand">
        <Search className="size-4 text-ink-muted" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Email, name or phone"
          aria-label="Search users"
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </label>

      {(users.error || setRole.error) && (
        <Alert tone="error" className="mb-4">
          {(users.error ?? setRole.error)!.message}
        </Alert>
      )}

      <div className="overflow-x-auto rounded-sm border border-bone/10">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-line bg-surface-sunken text-left text-xs tracking-wider text-ink-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="w-48 px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone/10">
            {users.isPending && (
              <tr>
                <td colSpan={4} className="px-4 py-3">
                  <Skeleton className="h-9" />
                </td>
              </tr>
            )}
            {users.data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <p className="text-bone">{u.fullName ?? '—'}</p>
                  <p className="text-xs text-ink-subtle">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-ink-muted">{u.phone ?? '—'}</td>
                <td className="px-4 py-3 text-ink-muted">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <Select
                    aria-label={`Role for ${u.email}`}
                    value={u.role}
                    disabled={u.id === user?.id || setRole.isPending}
                    title={u.id === user?.id ? 'You cannot change your own role' : undefined}
                    onChange={(e) => {
                      const role = e.target.value as UserRole
                      if (window.confirm(`Change ${u.email} to ${role}?`)) setRole.mutate({ id: u.id, role })
                    }}
                    className="h-9"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    {!ASSIGNABLE_ROLES.includes(u.role) && (
                      <option value={u.role} disabled>
                        {u.role} (retired)
                      </option>
                    )}
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
