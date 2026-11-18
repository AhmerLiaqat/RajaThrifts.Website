import { useState } from 'react'
import { Panel } from '@/components/admin/AdminUI'
import { Button, Input } from '@/components/ui'
import { Alert, Textarea } from '@/components/ui/Field'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { formatDate } from '@/lib/utils/format'
import { normaliseWhatsappNumber } from '@/lib/utils/whatsapp'
import type { StoreSettings } from '@/types/dashboard'
import { useStoreSettings, useUpdateSettings } from '../../hooks'

type TextKey =
  | 'bankName'
  | 'bankAccountTitle'
  | 'bankAccountNumber'
  | 'bankIban'
  | 'paymentInstructions'
  | 'whatsappNumber'
  | 'whatsappGroupUrl'

function SettingsForm({ settings }: { settings: StoreSettings }) {
  const update = useUpdateSettings()
  const [threshold, setThreshold] = useState(String(settings.lowStockThreshold))
  const [returnWindow, setReturnWindow] = useState(String(settings.returnWindowDays))
  const [delivery, setDelivery] = useState(String(settings.deliveryCharge / 100))
  const [freeOver, setFreeOver] = useState(
    settings.freeDeliveryThreshold === null ? '' : String(settings.freeDeliveryThreshold / 100),
  )
  const [text, setText] = useState<Record<TextKey, string>>({
    bankName: settings.bankName ?? '',
    bankAccountTitle: settings.bankAccountTitle ?? '',
    bankAccountNumber: settings.bankAccountNumber ?? '',
    bankIban: settings.bankIban ?? '',
    paymentInstructions: settings.paymentInstructions ?? '',
    whatsappNumber: settings.whatsappNumber ?? '',
    whatsappGroupUrl: settings.whatsappGroupUrl ?? '',
  })
  const field = (key: TextKey) => ({
    value: text[key],
    onChange: (e: { target: { value: string } }) => setText((t) => ({ ...t, [key]: e.target.value })),
  })

  const t = Number(threshold)
  const w = Number(returnWindow)
  const d = Number(delivery)
  const f = freeOver.trim() === '' ? null : Number(freeOver)
  const deliveryValid = Number.isFinite(d) && d >= 0 && (f === null || (Number.isFinite(f) && f >= 0))
  const wa = normaliseWhatsappNumber(text.whatsappNumber)
  const waError = text.whatsappNumber && !/^[1-9][0-9]{7,14}$/.test(wa) ? 'Enter a number like 0300 1234567' : undefined
  const groupError =
    text.whatsappGroupUrl && !/^https:\/\/(chat\.whatsapp\.com|wa\.me|whatsapp\.com)\//.test(text.whatsappGroupUrl.trim())
      ? 'Paste the invite link, e.g. https://chat.whatsapp.com/…'
      : undefined
  const valid =
    Number.isInteger(t) && t >= 0 && t <= 50 && Number.isInteger(w) && w >= 0 && w <= 60 && !waError && !groupError && deliveryValid

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        update.mutate({
          lowStockThreshold: t,
          returnWindowDays: w,
          deliveryCharge: Math.round(d * 100),
          freeDeliveryThreshold: f === null ? null : Math.round(f * 100),
          ...text,
          whatsappNumber: text.whatsappNumber ? wa : '',
          whatsappGroupUrl: text.whatsappGroupUrl.trim(),
        })
      }}
      className="flex max-w-2xl flex-col gap-6"
    >
      {update.error && <Alert tone="error">{update.error.message}</Alert>}
      {update.isSuccess && <Alert tone="success">Settings saved.</Alert>}

      <Panel title="Bank account for advance payment">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-ink-muted">
            Shown to customers at checkout. They transfer the order total, then upload a screenshot of the
            transfer.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input label="Bank name" placeholder="Meezan Bank" {...field('bankName')} />
            <Input label="Account title" placeholder="Raja Thrifts" {...field('bankAccountTitle')} />
            <Input label="Account number" {...field('bankAccountNumber')} />
            <Input label="IBAN (optional)" placeholder="PK36 SCBL 0000 0011 2345 6702" {...field('bankIban')} />
          </div>
          <Textarea
            label="Extra payment instructions (optional)"
            placeholder="You can also send to our Easypaisa / JazzCash: 0300 1234567 (Raja Thrifts)"
            {...field('paymentInstructions')}
          />
        </div>
      </Panel>

      <Panel title="Delivery charge">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Delivery charge (Rs)"
            type="number"
            min={0}
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            hint="Added to every order total. 0 = free delivery."
          />
          <Input
            label="Free delivery over (Rs, optional)"
            type="number"
            min={0}
            value={freeOver}
            onChange={(e) => setFreeOver(e.target.value)}
            hint="Leave empty to always charge delivery."
          />
        </div>
      </Panel>

      <Panel title="WhatsApp">
        <div className="flex flex-col gap-5">
          <Input
            label="Shop WhatsApp number"
            placeholder="0300 1234567"
            error={waError}
            hint="After placing an order, customers get a button to send you the order details on this number."
            {...field('whatsappNumber')}
          />
          <Input
            label="WhatsApp group invite link"
            placeholder="https://chat.whatsapp.com/…"
            error={groupError}
            hint="The floating WhatsApp button on the website opens this group. In WhatsApp: group info → Invite via link → Copy link."
            {...field('whatsappGroupUrl')}
          />
        </div>
      </Panel>

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
        description="Bank details, WhatsApp and store rules used across checkout and the dashboard. Admin only."
      />
      {settings.error && <Alert tone="error">{settings.error.message}</Alert>}
      {settings.data && <SettingsForm key={settings.data.updatedAt} settings={settings.data} />}
    </>
  )
}
