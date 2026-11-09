import { useQuery } from '@tanstack/react-query'
import { Mail, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import {
  DataTable,
  Drawer,
  DrawerSection,
  SearchBox,
  StatTile,
  TableMessage,
} from '@/components/admin/AdminUI'
import { Alert } from '@/components/ui/Field'
import { OrderStatusBadge } from '@/features/account/components/OrderBits'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { formatDate, formatPrice } from '@/lib/utils/format'
import { orderService, profileService } from '@/services'
import type { CustomerSummary } from '@/types/dashboard'
import { useCustomers } from '../../hooks'

function CustomerPanel({ customer }: { customer: CustomerSummary }) {
  const profile = useQuery({
    queryKey: ['admin', 'customer', customer.id],
    queryFn: () => profileService.getById(customer.id),
  })
  const orders = useQuery({
    queryKey: ['admin', 'customer-orders', customer.id],
    queryFn: () => orderService.listForUser(customer.id),
  })
  const p = profile.data
  const address = p && [p.line1, p.line2, p.city, p.province, p.postalCode].filter(Boolean).join(', ')

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Orders" value={customer.ordersCount} />
        <StatTile label="Spent" value={formatPrice(customer.totalSpent)} />
        <StatTile label="Open returns" value={customer.openReturns} />
      </div>

      <DrawerSection title="Contact">
        <ul className="space-y-2 text-sm">
          {customer.email && (
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-ink-subtle" />
              <a href={`mailto:${customer.email}`} className="hover:text-sand">
                {customer.email}
              </a>
            </li>
          )}
          {customer.phone && (
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-ink-subtle" />
              <a href={`tel:${customer.phone}`} className="hover:text-sand">
                {customer.phone}
              </a>
            </li>
          )}
        </ul>
        <p className="mt-3 text-sm text-ink-muted">{address || 'No saved address.'}</p>
        <p className="mt-1 text-xs text-ink-subtle">Customer since {formatDate(customer.createdAt)}</p>
      </DrawerSection>

      <DrawerSection title="Orders">
        {orders.isPending ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : !orders.data?.length ? (
          <p className="text-sm text-ink-muted">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-bone/10">
            {orders.data.map((o) => (
              <li key={o.id}>
                <Link
                  to={`${paths.admin.orders}?q=${o.orderNumber}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-sand"
                >
                  <span>
                    <span className="block font-mono text-sm">{o.orderNumber}</span>
                    <span className="text-xs text-ink-subtle">
                      {formatDate(o.placedAt)} · {o.items.length} items
                    </span>
                  </span>
                  <OrderStatusBadge status={o.status} />
                  <span className="text-sm tabular-nums">{formatPrice(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>
    </>
  )
}

export default function CustomersPage() {
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const customers = useCustomers(search)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = customers.data?.find((c) => c.id === selectedId) ?? null

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Contact details, order history and lifetime spend. Visible to staff only."
      />
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search name, email or phone"
        className="mb-6 max-w-md"
      />
      {customers.error && (
        <Alert tone="error" className="mb-4">
          {customers.error.message}
        </Alert>
      )}

      <DataTable
        head={
          <tr>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">City</th>
            <th className="px-4 py-3 text-right font-medium">Orders</th>
            <th className="px-4 py-3 text-right font-medium">Spent</th>
            <th className="px-4 py-3 font-medium">Last order</th>
          </tr>
        }
      >
        {customers.isPending && <TableMessage colSpan={6}>Loading…</TableMessage>}
        {customers.data?.map((c) => (
          <tr key={c.id} onClick={() => setSelectedId(c.id)} className="cursor-pointer hover:bg-white/[0.03]">
            <td className="px-4 py-3">
              <button type="button" className="text-left text-bone hover:text-sand">
                {c.fullName ?? '—'}
              </button>
              <p className="text-xs text-ink-subtle">{c.email}</p>
            </td>
            <td className="px-4 py-3 text-ink-muted">{c.phone ?? '—'}</td>
            <td className="px-4 py-3 text-ink-muted">{c.city ?? '—'}</td>
            <td className="px-4 py-3 text-right tabular-nums">{c.ordersCount}</td>
            <td className="px-4 py-3 text-right tabular-nums">{formatPrice(c.totalSpent)}</td>
            <td className="px-4 py-3 text-xs text-ink-muted">
              {c.lastOrderAt ? formatDate(c.lastOrderAt) : 'Never'}
            </td>
          </tr>
        ))}
        {customers.data?.length === 0 && <TableMessage colSpan={6}>No customers match.</TableMessage>}
      </DataTable>

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.fullName ?? selected?.email}
        subtitle="Customer"
      >
        {selected && <CustomerPanel customer={selected} />}
      </Drawer>
    </>
  )
}
