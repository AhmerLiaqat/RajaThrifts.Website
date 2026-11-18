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
import { MIN_PRODUCT_IMAGES } from '@/types/product'
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
  emptyVariant,
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
    <section className="rounded-xl border border-line bg-surface-raised shadow-card p-5 sm:p-6">
      <h2 className="font-display text-xs tracking-wider uppercase">{title}</h2>
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
    <p className="flex items-baseline justify-between rounded-sm bg-surface-sunken px-3 py-2 text-sm">
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
  const e = formState.errors
  const variants = useFieldArray({ control, name: 'variants' })
  const defects = useFieldArray({ control, name: 'defects' })

  const imageCount = product?.images.length ?? 0
  const onSubmit = form.handleSubmit((values) => {
    // Customers need at least MIN_PRODUCT_IMAGES real photos before a pair goes live.
    if (values.status === 'active' && imageCount < MIN_PRODUCT_IMAGES) {
      form.setError('status', {
        message: product
          ? `Add at least ${MIN_PRODUCT_IMAGES} photos before publishing (${imageCount} so far). Save as Draft for now.`
          : `Save as Draft first, then add at least ${MIN_PRODUCT_IMAGES} photos before publishing.`,
      })
      return
    }
    save.mutate(formToValues(values, product?.id), {
      onSuccess: (id) => {
        setSaved(true)
        form.reset(values)
        if (!product) navigate(paths.admin.productEdit(id), { replace: true, state: { created: true } })
      },
    })
  })

  const fillSkus = () => {
    const { collection, name } = form.getValues()
    form.getValues('variants').forEach((v, i) => {
      if (v.sizeValue && !v.sku)
        setValue(`variants.${i}.sku`, suggestSku(collection, name, v.sizeValue), { shouldDirty: true })
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
                  className="grid grid-cols-1 gap-3 rounded-sm border border-bone/10 p-3 sm:grid-cols-[1fr_140px_2fr_auto] sm:items-start"
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
          description="Enter the EU, UK and US size printed on each pair (all three are required; conversions vary by brand). Length in cm is optional. Thrift stock is usually one pair per size. Quantity edits are recorded in the inventory ledger."
        >
          {(e.variants?.root?.message || e.variants?.message) && (
            <p className="text-xs text-danger">{e.variants?.root?.message ?? e.variants?.message}</p>
          )}
          <div className="flex flex-col gap-3">
            {variants.fields.map((f, i) => (
              <div
                key={f.id}
                className="grid grid-cols-4 gap-3 rounded-sm border border-bone/10 p-3 sm:grid-cols-[repeat(4,70px)_1fr_70px_110px_auto] sm:items-start"
              >
                {(
                  [
                    ['sizeValue', 'EU', '42'],
                    ['ukSize', 'UK', '8'],
                    ['usSize', 'US', '9'],
                  ] as const
                ).map(([field, system, example]) => (
                  <Input
                    key={field}
                    label={i === 0 ? `${system} size *` : undefined}
                    aria-label={`${system} size`}
                    aria-required
                    inputMode="decimal"
                    placeholder={example}
                    className="tabular-nums"
                    error={e.variants?.[i]?.[field]?.message}
                    {...register(`variants.${i}.${field}`)}
                  />
                ))}
                <Input
                  label={i === 0 ? 'cm' : undefined}
                  aria-label="Length in cm (optional)"
                  inputMode="decimal"
                  placeholder="26.5"
                  title="Optional: foot / insole length in cm"
                  className="tabular-nums"
                  error={e.variants?.[i]?.cmSize?.message}
                  {...register(`variants.${i}.cmSize`)}
                />
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
              onClick={() => variants.append(emptyVariant())}
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
          description={`At least ${MIN_PRODUCT_IMAGES} photos of the actual pair (front, side, back and sole work best), plus close-ups of any defects.`}
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
            hint={`Needs at least ${MIN_PRODUCT_IMAGES} photos to be Active. Active listings with no stock show as sold out automatically.`}
            error={e.status?.message}
            {...register('status')}
          >
            <option value="draft">Draft (not published)</option>
            <option value="active">Active</option>
            <option value="sold_out">Sold out</option>
            <option value="archived">Hidden (archived)</option>
          </Select>
          <label className="flex items-center gap-3 text-sm text-bone/85">
            <input type="checkbox" className="size-4 accent-sand" {...register('isFeatured')} /> Feature
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
            <p className="mb-3 flex items-center gap-2 text-xs tracking-wider text-ink-subtle uppercase">
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
                  <Archive className="size-3.5" /> Hide from shop
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
