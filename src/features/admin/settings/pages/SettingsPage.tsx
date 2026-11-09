import { useState } from 'react'
import { Panel } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { formatDate } from '@/lib/utils/format'
import type { StoreSettings } from '@/types/dashboard'
import { useStoreSettings, useUpdateSettings } from '../../hooks'

function SettingsForm({ settings }: { settings: StoreSettings }) {
  const update = useUpdateSettings()
  const [threshold, setThreshold] = useState(String(settings.lowStockThreshold))
  const [returnWindow, setReturnWindow] = useState(String(settings.returnWindowDays))
  const t = Number(threshold)
  const w = Number(returnWindow)
  const valid = Number.isInteger(t) && t >= 0 && t <= 50 && Number.isInteger(w) && w >= 0 && w <= 60

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) update.mutate({ lowStockThreshold: t, returnWindowDays: w })
      }}
      className="flex max-w-xl flex-col gap-6"
    >
      {update.error && <Alert tone="error">{update.error.message}</Alert>}
      {update.isSuccess && <Alert tone="success">Settings saved.</Alert>}
      <Panel title="Inventory">
        <Input
          label="Low stock threshold (pairs)"
          type="number"
          min={0}
          max={50}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          hint="Active listings with this many pairs or fewer show as low stock. Most thrift listings are single pairs, so 1 flags last pairs."
        />
      </Panel>
      <Panel title="Returns">
        <Input
          label="Return window (days after delivery)"
          type="number"
          min={0}
          max={60}
          value={returnWindow}
          onChange={(e) => setReturnWindow(e.target.value)}
          hint="Customers can request a return from their order page within this window. 0 turns customer requests off (staff can still log returns)."
        />
      </Panel>
      <div className="flex items-center gap-4">
        <Button type="submit" variant="accent" loading={update.isPending} disabled={!valid}>
          Save settings
        </Button>
        <span className="text-xs text-ink-subtle">Last updated {formatDate(settings.updatedAt)}</span>
      </div>
    </form>
  )
}

/** Admin only: route guard + store_settings RLS (shopkeepers' updates affect zero rows). */
export default function SettingsPage() {
  const settings = useStoreSettings()
  return (
    <>
      <AdminPageHeader
        title="Store settings"
        description="Rules applied across the dashboard and checkout. Admin only."
      />
      {settings.error && <Alert tone="error">{settings.error.message}</Alert>}
      {settings.data && <SettingsForm key={settings.data.updatedAt} settings={settings.data} />}
    </>
  )
}
