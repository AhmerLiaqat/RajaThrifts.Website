import { getSupabase } from '@/lib/supabase/client'
import type { PublicStoreSettings } from '@/types/dashboard'
import { unwrap } from '../core/errors'
import { pkrToMinor } from '../core/money'

export const PUBLIC_SETTINGS_COLUMNS =
  'bank_name, bank_account_title, bank_account_number, bank_iban, payment_instructions, whatsapp_number, whatsapp_group_url, delivery_charge, free_delivery_threshold'

export interface PublicSettingsRow {
  bank_name: string | null
  bank_account_title: string | null
  bank_account_number: string | null
  bank_iban: string | null
  payment_instructions: string | null
  whatsapp_number: string | null
  whatsapp_group_url: string | null
  delivery_charge?: number | string | null
  free_delivery_threshold?: number | string | null
}

export const mapPublicSettings = (r: PublicSettingsRow): PublicStoreSettings => ({
  bankName: r.bank_name,
  bankAccountTitle: r.bank_account_title,
  bankAccountNumber: r.bank_account_number,
  bankIban: r.bank_iban,
  paymentInstructions: r.payment_instructions,
  whatsappNumber: r.whatsapp_number,
  whatsappGroupUrl: r.whatsapp_group_url,
  deliveryCharge: pkrToMinor(Number(r.delivery_charge ?? 0)),
  freeDeliveryThreshold:
    r.free_delivery_threshold === null || r.free_delivery_threshold === undefined
      ? null
      : pkrToMinor(Number(r.free_delivery_threshold)),
})

/** store_settings is publicly readable; this fetches only the customer-facing columns. */
export const storeService = {
  async publicSettings(): Promise<PublicStoreSettings> {
    return mapPublicSettings(
      unwrap<PublicSettingsRow>(
        await getSupabase().from('store_settings').select(PUBLIC_SETTINGS_COLUMNS).single(),
      ),
    )
  },
}

/** wa.me link to a number, optionally with a pre-filled message. */
export const whatsappChatUrl = (number: string, text?: string) =>
  `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
