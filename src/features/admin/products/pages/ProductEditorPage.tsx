import { zodResolver } from '@hookform/resolvers/zod'
import { Archive, ArrowLeft, Lock, Plus, Trash2, Wand2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { PageLoader } from '@/components/feedback/PageLoader'
import { Button, Input } from '@/components/ui'
import { Alert, Select, Textarea } from '@/components/ui/Field'
import { env } from '@/config/env'
import { COLLECTIONS } from '@/constants/collections'
import { CONDITION_META } from '@/constants/product'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { slugify } from '@/services/products/admin-product.service'
import type { AdminProduct } from '@/types/dashboard'
import { useSizeChart } from '@/features/admin/catalog/hooks'
import { formatPrice } from '@/lib/utils/format'
import { ImageManager } from '../components/ImageManager'
import {
  useAdminProduct,
  useBrands,
  useCategories,
  useCreateBrand,
  useDeleteProduct,
  useSaveProduct,
  useSetProductStatus,
} from '../hooks'
import {
  emptyProductForm,
  formToValues,
  productFormSchema,
  productToForm,
  suggestSku,
  type ProductFormInput,
  type ProductFormOutput,
} from '../productForm'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-sm border border-bone/10 bg-carbon/40 p-5 sm:p-6">
      <h2 className="font-display text-xs tracking-[0.24em] uppercase">{title}</h2>
      {description && <p className="mt-1 text-xs text-ink-muted">{description}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  )
}

function BrandField({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (id: string) => void
  error?: string
}) {
  const brands = useBrands()
  const create = useCreateBrand()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  if (adding) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wide text-bone/80">New brand</span>
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 flex-1 rounded-md border border-line-strong bg-surface-raised px-3 text-sm focus:border-sand focus:outline-none"
          />
          <Button
            size="sm"
            className="h-11"
            loading={create.isPending}
            disabled={name.trim().length < 1}
            onClick={() =>
              create.mutate(name, {
                onSuccess: (b) => {
                  onChange(b.id)
                  setAdding(false)
                  setName('')
                },
              })
            }
          >
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-11" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
        {create.error && <p className="text-xs text-danger">{create.error.message}</p>}
      </div>
    )
  }

  return (
    <div>
      <Select label="Brand" value={value} onChange={(e) => onChange(e.target.value)} error={error}>
        <option value="">{brands.isPending ? 'Loading…' : 'Choose a brand'}</option>
        {brands.data?.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-1.5 text-xs text-sand hover:underline"
      >
        + Add a brand
      </button>
    </div>
  )
}

/** Live margin from the typed selling and purchase prices. */
function MarginPreview({ price, cost }: { price: string; cost: string }) {
  const p = Number(price)
  const c = Number(cost)
  if (!price || !cost || !Number.isFinite(p) || !Number.isFinite(c) || p <= 0) {
    return <p className="text-xs text-ink-subtle">Enter both prices to see the margin.</p>
  }
  const margin = p - c
  const pct = Math.round((margin / p) * 100)
  return (
    <p className="flex items-baseline justify-between rounded-sm bg-white/[0.03] px-3 py-2 text-sm">
      <span className="text-ink-muted">Margin per pair</span>
      <span className={margin < 0 ? 'text-danger tabular-nums' : 'text-bone tabular-nums'}>
        {formatPrice(Math.round(margin * 100))} · {pct}%
      </span>
    </p>
  )
}

function ProductForm({ product }: { product?: AdminProduct }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const categories = useCategories()
  const save = useSaveProduct()
  const setStatus = useSetProductStatus()
  const del = useDeleteProduct()
  const [slugTouched, setSlugTouched] = useState(!!product)
  const [saved, setSaved] = useState(false)

  const form = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? productToForm(product) : emptyProductForm(),
  })
  const { register, control, setValue, formState } = form
  const [slug, brandId, price, purchasePrice] = useWatch({
    control,
    name: ['slug', 'brandId', 'price', 'purchasePrice'],
  })
  const sizeChart = useSizeChart()
  // Active chart sizes, plus any legacy size already on this product.
  const sizeOptions = [
    ...(sizeChart.data ?? []),
    ...(product?.variants ?? [])
      .filter((v) => !sizeChart.data?.some((s) => s.eu === v.size.value))
      .map((v) => ({ eu: v.size.value, uk: null, isActive: true })),
  ]
  const e = formState.errors
  const variants = useFieldArray({ control, name: 'variants' })
  const defects = useFieldArray({ control, name: 'defects' })

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(formToValues(values, product?.id), {
      onSuccess: (id) => {
        setSaved(true)
        form.reset(values)
        if (!product) navigate(paths.admin.productEdit(id), { replace: true, state: { created: true } })
      },
    }),
  )

  const fillSkus = () => {
    const { collection, name } = form.getValues()
    form.getValues('variants').forEach((v, i) => {
      if (v.sizeValue && !v.sku)
        setValue(`variants.${i}.sku`, suggestSku(collection, name, v.sizeValue), { shouldDirty: true })
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        {save.error && (
          <Alert tone="error" title="Could not save">
            {save.error.message}
          </Alert>
        )}
        {saved && !formState.isDirty && (
          <Alert tone="success">Saved. Changes are live on the storefront.</Alert>
        )}

        <Section title="Listing">
          <Input
            label="Name"
            placeholder="Jordan 1 Low, Black / Red"
            error={e.name?.message}
            {...register('name', {
              onChange: (ev) => !slugTouched && setValue('slug', slugify(ev.target.value)),
            })}
          />
          <Input
            label="URL slug"
            hint={`/products/${slug || '…'}`}
            error={e.slug?.message}
            {...register('slug', { onChange: () => setSlugTouched(true) })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <BrandField
              value={brandId}
              onChange={(id) => setValue('brandId', id, { shouldDirty: true, shouldValidate: true })}
              error={e.brandId?.message}
            />
            <Select label="Category" {...register('categoryId')}>
              <option value="">None</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Input label="Model (optional)" placeholder="Air Jordan 1 Low" {...register('model')} />
            <Input label="Colour" placeholder="Black / Red" {...register('color')} />
            <Input label="Imported from" placeholder="United Kingdom" {...register('originCountry')} />
          </div>
          <Textarea label="Description" rows={4} {...register('description')} />
        </Section>

        <Section
          title="Grading & condition"
          description="Collection is the commercial tier. Condition and defects are what you inspected."
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <Select label="Collection" {...register('collection')}>
              {COLLECTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select label="Condition" {...register('condition')}>
              {Object.entries(CONDITION_META).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Select label="Fit" {...register('gender')}>
              <option value="unisex">Unisex</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids</option>
            </Select>
          </div>
          <Textarea
            label="Inspector notes"
            rows={3}
            placeholder="Overall condition summary shown to customers"
            {...register('conditionNotes')}
          />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-bone/80">
                Defect disclosure ({defects.fields.length})
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => defects.append({ area: '', severity: 'minor', description: '' })}
              >
                <Plus className="size-3.5" /> Add defect
              </Button>
            </div>
            {defects.fields.length === 0 && (
              <p className="text-xs text-ink-subtle">
                No defects recorded. Customers see “No defects recorded at inspection”.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {defects.fields.map((f, i) => (
                <div
                  key={f.id}
                  className="grid gap-3 rounded-sm border border-bone/10 p-3 sm:grid-cols-[1fr_140px_2fr_auto] sm:items-start"
                >
                  <Input
                    aria-label="Area"
                    placeholder="Left toe box"
                    error={e.defects?.[i]?.area?.message}
                    {...register(`defects.${i}.area`)}
                  />
                  <Select aria-label="Severity" {...register(`defects.${i}.severity`)}>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="notable">Notable</option>
                  </Select>
                  <Input
                    aria-label="Description"
                    placeholder="Faint scuff, visible up close"
                    error={e.defects?.[i]?.description?.message}
                    {...register(`defects.${i}.description`)}
                  />
                  <button
                    type="button"
                    aria-label="Remove defect"
                    onClick={() => defects.remove(i)}
                    className="grid h-11 w-11 place-items-center rounded text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          title="Sizes & stock"
          description="Thrift stock is usually one pair per size. Quantity edits are recorded in the inventory ledger."
        >
          {(e.variants?.root?.message || e.variants?.message) && (
            <p className="text-xs text-danger">{e.variants?.root?.message ?? e.variants?.message}</p>
          )}
          <div className="flex flex-col gap-3">
            {variants.fields.map((f, i) => (
              <div
                key={f.id}
                className="grid grid-cols-2 gap-3 rounded-sm border border-bone/10 p-3 sm:grid-cols-[100px_1fr_100px_140px_auto] sm:items-start"
              >
                <Select
                  label={i === 0 ? 'EU size' : undefined}
                  aria-label="EU size"
                  error={e.variants?.[i]?.sizeValue?.message}
                  {...register(`variants.${i}.sizeValue`)}
                >
                  <option value="">Size…</option>
                  {sizeOptions.map((s) => (
                    <option key={s.eu} value={s.eu} disabled={!s.isActive}>
                      EU {s.eu}
                      {s.uk ? ` · UK ${s.uk}` : ''}
                    </option>
                  ))}
                </Select>
                <Input
                  label={i === 0 ? 'SKU' : undefined}
                  aria-label="SKU"
                  placeholder="RT-PRM-J1L-42"
                  className="font-mono uppercase"
                  error={e.variants?.[i]?.sku?.message}
                  {...register(`variants.${i}.sku`)}
                />
                <Input
                  label={i === 0 ? 'Qty' : undefined}
                  aria-label="Quantity"
                  type="number"
                  min={0}
                  error={e.variants?.[i]?.quantity?.message}
                  {...register(`variants.${i}.quantity`)}
                />
                <Input
                  label={i === 0 ? 'Price override' : undefined}
                  aria-label="Price override in PKR"
                  inputMode="decimal"
                  placeholder="—"
                  error={e.variants?.[i]?.priceOverride?.message}
                  {...register(`variants.${i}.priceOverride`)}
                />
                <button
                  type="button"
                  aria-label="Remove size"
                  disabled={variants.fields.length === 1}
                  onClick={() => variants.remove(i)}
                  className={`grid h-11 w-11 place-items-center rounded text-danger hover:bg-danger/10 disabled:opacity-30 ${i === 0 ? 'sm:mt-[1.6rem]' : ''}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => variants.append({ sizeValue: '', sku: '', quantity: 1, priceOverride: '' })}
            >
              <Plus className="size-3.5" /> Add size
            </Button>
            <Button size="sm" variant="ghost" onClick={fillSkus}>
              <Wand2 className="size-3.5" /> Generate missing SKUs
            </Button>
          </div>
        </Section>

        <Section
          title="Photos"
          description="Front, side, back and sole views of the actual pair, plus on-foot and close-ups of any defects."
        >
          {product ? (
            <ImageManager productId={product.id} productName={product.name} images={product.images} />
          ) : (
            <p className="text-sm text-ink-muted">Save the product first, then add photos.</p>
          )}
        </Section>
      </div>

      {/* Sidebar */}
      <aside className="flex flex-col gap-6 xl:sticky xl:top-8 xl:self-start">
        <Section title="Publishing">
          <Select
            label="Status"
            hint="Active listings with no stock show as sold out automatically."
            {...register('status')}
          >
            <option value="draft">Draft (hidden)</option>
            <option value="active">Active</option>
            <option value="sold_out">Sold out</option>
            <option value="archived">Archived (hidden)</option>
          </Select>
          <label className="flex items-center gap-3 text-sm text-bone/85">
            <input type="checkbox" className="size-4 accent-[#C7B99A]" {...register('isFeatured')} /> Feature
            on the homepage
          </label>
        </Section>

        <Section title="Pricing (PKR)">
          <Input
            label="Selling price"
            inputMode="decimal"
            placeholder="24500"
            error={e.price?.message}
            {...register('price')}
          />
          <Input
            label="Original retail (optional)"
            inputMode="decimal"
            placeholder="32000"
            hint="Shown struck through on the storefront"
            error={e.compareAtPrice?.message}
            {...register('compareAtPrice')}
          />
          <div className="border-t border-bone/10 pt-5">
            <p className="mb-3 flex items-center gap-2 text-[11px] tracking-[0.2em] text-ink-subtle uppercase">
              <Lock className="size-3" /> Staff only
            </p>
            <div className="flex flex-col gap-5">
              <Input
                label="Purchase price (cost per pair)"
                inputMode="decimal"
                placeholder="12000"
                hint="Never shown to customers"
                error={e.purchasePrice?.message}
                {...register('purchasePrice')}
              />
              <Input
                label="Supplier / bale reference"
                placeholder="Bale UK-17"
                {...register('supplierRef')}
              />
              <MarginPreview price={price} cost={purchasePrice} />
            </div>
          </div>
        </Section>

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            loading={save.isPending}
            disabled={!env.isSupabaseConfigured}
          >
            {product ? 'Save changes' : 'Create product'}
          </Button>
          {product && (
            <>
              <Link
                to={paths.product(product.slug)}
                target="_blank"
                className="text-center text-xs text-ink-muted underline-offset-4 hover:underline"
              >
                View on storefront
              </Link>
              {product.status !== 'archived' && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: product.id, status: 'archived' })}
                >
                  <Archive className="size-3.5" /> Archive
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  loading={del.isPending}
                  onClick={() =>
                    window.confirm(
                      `Permanently delete “${product.name}” and its photos? Past orders keep their records.`,
                    ) && del.mutate(product, { onSuccess: () => navigate(paths.admin.products) })
                  }
                >
                  <Trash2 className="size-3.5" /> Delete (admin)
                </Button>
              )}
              {(setStatus.error || del.error) && (
                <Alert tone="error">{setStatus.error?.message ?? del.error?.message}</Alert>
              )}
            </>
          )}
        </div>
      </aside>
    </form>
  )
}

export default function ProductEditorPage() {
  const { productId } = useParams()
  const product = useAdminProduct(productId)

  return (
    <>
      <Link
        to={paths.admin.products}
        className="mb-4 inline-flex items-center gap-2 text-xs text-ink-muted hover:text-bone"
      >
        <ArrowLeft className="size-3.5" /> Products
      </Link>
      <AdminPageHeader title={productId ? (product.data?.name ?? 'Edit product') : 'New product'} />
      {productId && product.isPending ? (
        <PageLoader />
      ) : product.error ? (
        <Alert tone="error">{product.error.message}</Alert>
      ) : (
        // key: re-initialise the form when switching between products.
        <ProductForm key={product.data?.id ?? 'new'} product={product.data} />
      )}
    </>
  )
}
