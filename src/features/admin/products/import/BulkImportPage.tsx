import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderOpen,
  ImageIcon,
  Images,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/router/paths'
import { Panel, StatTile } from '@/components/admin/AdminUI'
import { Button } from '@/components/ui'
import { Alert } from '@/components/ui/Field'
import { env } from '@/config/env'
import { CONDITION_META } from '@/constants/product'
import { CollectionBadge } from '@/features/catalog/components/CollectionBadge'
import { AdminPageHeader } from '@/layouts/admin/AdminLayout'
import { queryKeys } from '@/lib/query/queryClient'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/utils/format'
import { adminProductService } from '@/services'
import { MIN_PRODUCT_IMAGES } from '@/types/product'
import { isSupportedImage, loadStudioModel, processPhoto, type StudioMode, type StudioResult } from './photoStudio'
import { batchStamp, brandResolver, importOne } from './runImport'
import { downloadTemplate, normalizeCode, readImportSheet, type ImportRow } from './spreadsheet'

type ItemStatus = 'idle' | 'processing' | 'ready' | 'importing' | 'done' | 'error'

interface Item {
  row: ImportRow
  photos: File[]
  mode: StudioMode
  processed: StudioResult[] | null
  status: ItemStatus
  message?: string
  productId?: string
  published?: boolean
}

const natural = (a: File, b: File) =>
  (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, undefined, { numeric: true })

/** Groups photos by folder name (…/01/IMG_1.jpg) or file-name prefix (01-1.jpg, 01 (2).jpg). */
function groupPhotos(files: File[], codes: Set<string>) {
  const groups = new Map<string, File[]>()
  for (const f of files.filter(isSupportedImage).sort(natural)) {
    const parts = (f.webkitRelativePath || f.name).split('/')
    const folder = parts.length >= 2 ? normalizeCode(parts[parts.length - 2]) : ''
    const prefix = normalizeCode(f.name.replace(/\.[^.]+$/, '').split(/[-_ .(]/)[0])
    // Prefer the folder when it matches a code (or when files sit in sub-folders); otherwise the file prefix.
    const key = folder && (codes.has(folder) || parts.length >= 3) ? folder : prefix
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), f])
  }
  return groups
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-navy text-sm font-bold text-gold">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <div className="mt-1 text-sm text-ink-muted">{children}</div>
      </div>
    </div>
  )
}

function Thumb({ file, url }: { file?: File; url?: string }) {
  // HEIC cannot be previewed by most browsers; show a placeholder until it is processed.
  const local = useMemo(
    () =>
      !url && file && !(/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name))
        ? URL.createObjectURL(file)
        : undefined,
    [file, url],
  )
  useEffect(() => () => (local ? URL.revokeObjectURL(local) : undefined), [local])
  const src = url ?? local
  return src ? (
    <img src={src} alt="" className="size-14 rounded-lg bg-surface-sunken object-cover ring-1 ring-line" />
  ) : (
    <span className="grid size-14 place-items-center rounded-lg bg-surface-sunken text-ink-subtle ring-1 ring-line">
      <ImageIcon className="size-4" />
    </span>
  )
}

/**
 * Bulk import: one spreadsheet + a folder of photos → many products at once.
 * Photos are cleaned in the browser (background removal + studio backdrop), then each pair is
 * created as a draft, its photos are uploaded, and it is published when it has enough photos.
 */
export default function BulkImportPage() {
  const qc = useQueryClient()
  const brands = useQuery({
    queryKey: queryKeys.admin.brands,
    queryFn: adminProductService.listBrands,
    enabled: env.isSupabaseConfigured,
  })
  const existing = useQuery({
    queryKey: queryKeys.admin.products({}),
    queryFn: () => adminProductService.list({}),
    enabled: env.isSupabaseConfigured,
  })

  const [sheetName, setSheetName] = useState<string | null>(null)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [defaultMode, setDefaultMode] = useState<StudioMode>('studio')
  const [publish, setPublish] = useState(true)
  const [busy, setBusy] = useState<null | 'processing' | 'importing'>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [modelState, setModelState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const folderInput = useRef<HTMLInputElement>(null)
  const filesInput = useRef<HTMLInputElement>(null)
  const sheetInput = useRef<HTMLInputElement>(null)
  const stop = useRef(false)

  // Rebuild items whenever the sheet or photos change (keeps per-row choices where possible).
  const groups = useMemo(() => groupPhotos(files, new Set(rows.map((r) => r.code))), [files, rows])
  useEffect(() => {
    setItems((prev) =>
      rows.map((row) => {
        const before = prev.find((p) => p.row.code === row.code)
        const photos = groups.get(row.code) ?? groups.get(normalizeCode(row.name)) ?? []
        const same = before && before.photos.length === photos.length && before.photos.every((f, i) => f === photos[i])
        return {
          row,
          photos,
          mode: before?.mode ?? defaultMode,
          processed: same ? before.processed : null,
          status: same && before.status !== 'error' ? before.status : 'idle',
          message: same ? before.message : undefined,
          productId: same ? before.productId : undefined,
          published: same ? before.published : undefined,
        }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, groups])

  const unmatched = useMemo(() => {
    const used = new Set(items.flatMap((i) => (i.photos.length ? [i.row.code, normalizeCode(i.row.name)] : [])))
    return [...groups.entries()].filter(([k]) => !used.has(k))
  }, [groups, items])

  const duplicates = useMemo(() => {
    const set = new Set(
      (existing.data ?? []).flatMap((p) =>
        p.variants.map((v) => `${p.brand}|${p.name}|${v.size.value}`.toLowerCase()),
      ),
    )
    return (row: ImportRow) => row.sizes.some((s) => set.has(`${row.brand}|${row.name}|${s}`.toLowerCase()))
  }, [existing.data])

  const problems = (it: Item) => {
    const errors = [...it.row.errors]
    if (!it.photos.length) errors.push('No photos found for this code.')
    const warnings = [...it.row.warnings]
    if (it.photos.length && it.photos.length < MIN_PRODUCT_IMAGES)
      warnings.push(`Only ${it.photos.length} photo${it.photos.length === 1 ? '' : 's'}: it will be saved as a draft until it has ${MIN_PRODUCT_IMAGES}.`)
    if (duplicates(it.row)) warnings.push('A pair with this brand, name and size is already in the store.')
    return { errors, warnings }
  }

  const valid = items.filter((i) => problems(i).errors.length === 0)
  const pending = valid.filter((i) => i.status !== 'done')
  const done = items.filter((i) => i.status === 'done')

  const update = (code: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((p) => (p.row.code === code ? { ...p, ...patch } : p)))

  const onSheet = async (file: File | undefined) => {
    if (!file) return
    setSheetError(null)
    try {
      const parsed = await readImportSheet(file)
      setRows(parsed)
      setSheetName(file.name)
      if (!parsed.length) setSheetError('The spreadsheet has no product rows.')
    } catch (e) {
      setSheetError((e as Error).message)
    }
    if (sheetInput.current) sheetInput.current.value = ''
  }

  const addFiles = (list: FileList | null) => {
    // Copy now: a FileList is cleared when the input is reset right after this call.
    const incoming = Array.from(list ?? [])
    if (!incoming.length) return
    setFiles((prev) => {
      const key = (f: File) => `${f.webkitRelativePath || f.name}|${f.size}`
      const seen = new Set(prev.map(key))
      return [...prev, ...incoming.filter((f) => !seen.has(key(f)))]
    })
  }

  async function ensureModel() {
    if (modelState === 'ready') return true
    setModelState('loading')
    try {
      await loadStudioModel()
      setModelState('ready')
      return true
    } catch (e) {
      console.error(e)
      setModelState('failed')
      return false
    }
  }

  async function prepare(it: Item): Promise<StudioResult[]> {
    if (it.processed) return it.processed
    update(it.row.code, { status: 'processing', message: undefined })
    const out: StudioResult[] = []
    for (let i = 0; i < it.photos.length; i++) {
      out.push(await processPhoto(it.photos[i], it.mode, `${it.row.code}-${i + 1}`))
    }
    const notCleaned = it.mode === 'studio' ? out.filter((r) => !r.backgroundRemoved).length : 0
    update(it.row.code, {
      processed: out,
      status: 'ready',
      message: notCleaned ? `${notCleaned} photo(s) kept their original background (the shoe could not be separated).` : undefined,
    })
    return out
  }

  async function prepareAll() {
    const todo = valid.filter((i) => !i.processed && i.status !== 'done')
    if (!todo.length) return
    stop.current = false
    setBusy('processing')
    if (todo.some((i) => i.mode === 'studio')) await ensureModel()
    setProgress({ done: 0, total: todo.length })
    for (const [n, it] of todo.entries()) {
      if (stop.current) break
      try {
        await prepare(it)
      } catch (e) {
        update(it.row.code, { status: 'error', message: (e as Error).message })
      }
      setProgress({ done: n + 1, total: todo.length })
    }
    setBusy(null)
  }

  async function importAll() {
    const todo = valid.filter((i) => i.status !== 'done')
    if (!todo.length || !env.isSupabaseConfigured) return
    stop.current = false
    setBusy('importing')
    if (todo.some((i) => !i.processed && i.mode === 'studio')) await ensureModel()
    const resolveBrand = brandResolver(brands.data ?? [])
    const stamp = batchStamp()
    setProgress({ done: 0, total: todo.length })
    for (const [n, it] of todo.entries()) {
      if (stop.current) break
      try {
        const photos = await prepare(it)
        update(it.row.code, { status: 'importing' })
        const brandId = await resolveBrand(it.row.brand)
        const res = await importOne(it.row, photos, { brandId, stamp, publish })
        update(it.row.code, {
          status: 'done',
          productId: res.productId,
          published: res.published,
          message: res.photoErrors.length
            ? `Saved as draft. ${res.photoErrors.length} photo(s) failed to upload: ${res.photoErrors[0]}`
            : res.published
              ? 'Published'
              : 'Saved as draft',
        })
      } catch (e) {
        update(it.row.code, { status: 'error', message: (e as Error).message })
      }
      setProgress({ done: n + 1, total: todo.length })
    }
    setBusy(null)
    qc.invalidateQueries({ queryKey: ['admin'] })
    qc.invalidateQueries({ queryKey: queryKeys.products.all })
  }

  const setModeAll = (mode: StudioMode) => {
    setDefaultMode(mode)
    setItems((prev) =>
      prev.map((p) => (p.status === 'done' ? p : { ...p, mode, processed: p.mode === mode ? p.processed : null, status: p.mode === mode ? p.status : 'idle' })),
    )
  }

  const photoCount = items.reduce((n, i) => n + i.photos.length, 0)

  return (
    <div>
      <AdminPageHeader
        title="Bulk import"
        description="Add many pairs at once from one spreadsheet and a folder of photos. Backgrounds are cleaned automatically so every listing looks the same."
        actions={
          <Link
            to={paths.admin.products}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface-raised hover:text-ink"
          >
            <ArrowLeft className="size-4" /> Products
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {/* Inputs */}
          <Panel title="1. Add your spreadsheet and photos">
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => sheetInput.current?.click()}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors',
                  sheetName ? 'border-success/40 bg-success/5' : 'border-line-strong hover:border-sand hover:bg-sand-100/40',
                )}
              >
                <FileSpreadsheet className={cn('size-8', sheetName ? 'text-success' : 'text-sand')} />
                <span className="text-sm font-semibold text-ink">{sheetName ?? 'Choose spreadsheet'}</span>
                <span className="text-xs text-ink-subtle">
                  {sheetName ? `${rows.length} pairs found · click to replace` : 'Excel (.xlsx) or CSV, filled from the template'}
                </span>
              </button>
              <input
                ref={sheetInput}
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                hidden
                onChange={(e) => onSheet(e.target.files?.[0])}
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  addFiles(e.dataTransfer.files)
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center',
                  files.length ? 'border-success/40 bg-success/5' : 'border-line-strong',
                )}
              >
                <Images className={cn('size-8', files.length ? 'text-success' : 'text-sand')} />
                <span className="text-sm font-semibold text-ink">
                  {files.length ? `${files.length} photos added` : 'Add photos'}
                </span>
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => folderInput.current?.click()}>
                    <FolderOpen className="size-4" /> Choose folder
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => filesInput.current?.click()}>
                    <Upload className="size-4" /> Choose photos
                  </Button>
                  {files.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setFiles([])}>
                      Clear
                    </Button>
                  )}
                </div>
                <span className="text-xs text-ink-subtle">JPG, PNG, WebP or iPhone HEIC · or drop them here</span>
              </div>
              <input
                ref={folderInput}
                type="file"
                multiple
                hidden
                // Folder picker: keeps sub-folder names so photos can be matched by folder.
                {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <input
                ref={filesInput}
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                hidden
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
            {sheetError && (
              <Alert tone="error" className="mt-4">
                {sheetError}
              </Alert>
            )}
            {unmatched.length > 0 && rows.length > 0 && (
              <Alert tone="info" className="mt-4" title="Some photos don't match any row">
                {unmatched.slice(0, 8).map(([k, f]) => `"${k}" (${f.length})`).join(', ')}
                {unmatched.length > 8 && ` and ${unmatched.length - 8} more`}. Name each folder (or the start of
                each file name) exactly like the row&apos;s Code.
              </Alert>
            )}
          </Panel>

          {/* Review */}
          {items.length > 0 && (
            <Panel
              title="2. Review"
              description="Check each pair before importing. Rows with a red mark need fixing in the spreadsheet."
              actions={
                <Button size="sm" variant="outline" onClick={prepareAll} disabled={!!busy || !valid.some((i) => !i.processed && i.status !== 'done')}>
                  <Wand2 className="size-4" /> Preview photos
                </Button>
              }
            >
              <ul className="-my-2 divide-y divide-line">
                {items.map((it) => {
                  const { errors, warnings } = problems(it)
                  const thumbs = it.processed
                    ? it.processed.map((p) => ({ url: p.previewUrl }))
                    : it.photos.map((f) => ({ file: f }))
                  return (
                    <li key={it.row.line} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start">
                      <div className="flex shrink-0 gap-1.5">
                        {thumbs.slice(0, 4).map((t, i) => (
                          <Thumb key={i} {...t} />
                        ))}
                        {thumbs.length > 4 && (
                          <span className="grid size-14 place-items-center rounded-lg bg-surface-sunken text-xs font-semibold text-ink-muted ring-1 ring-line">
                            +{thumbs.length - 4}
                          </span>
                        )}
                        {!thumbs.length && <Thumb />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ink-muted">
                            {it.row.code || '—'}
                          </span>
                          <span className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">{it.row.brand}</span>
                          {it.row.collection && <CollectionBadge collection={it.row.collection} />}
                        </div>
                        <p className="mt-1 truncate font-semibold text-ink">{it.row.name || 'Untitled'}</p>
                        <p className="text-sm text-ink-muted">
                          EU {it.row.sizes.join(', ') || '—'} ·{' '}
                          {it.row.condition ? CONDITION_META[it.row.condition].label : '—'} ·{' '}
                          <span className="font-semibold text-ink">{it.row.price ? formatPrice(it.row.price * 100) : '—'}</span>
                          {it.row.originalPrice ? (
                            <s className="ml-1 text-ink-subtle">{formatPrice(it.row.originalPrice * 100)}</s>
                          ) : null}
                          {' · '}
                          {it.photos.length} {it.photos.length === 1 ? 'photo' : 'photos'}
                        </p>
                        {errors.map((m) => (
                          <p key={m} className="mt-1 flex items-start gap-1.5 text-xs font-medium text-danger">
                            <XCircle className="mt-px size-3.5 shrink-0" /> {m}
                          </p>
                        ))}
                        {warnings.map((m) => (
                          <p key={m} className="mt-1 flex items-start gap-1.5 text-xs text-warning">
                            <AlertTriangle className="mt-px size-3.5 shrink-0" /> {m}
                          </p>
                        ))}
                        {it.message && (
                          <p
                            className={cn(
                              'mt-1 flex items-start gap-1.5 text-xs',
                              it.status === 'error' ? 'font-medium text-danger' : it.status === 'done' ? 'text-success' : 'text-ink-muted',
                            )}
                          >
                            {it.message}
                            {it.productId && (
                              <Link to={paths.admin.productEdit(it.productId)} className="ml-1 font-semibold text-sand hover:underline">
                                Open
                              </Link>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-end">
                        <select
                          aria-label={`Background for ${it.row.name}`}
                          value={it.mode}
                          disabled={!!busy || it.status === 'done'}
                          onChange={(e) =>
                            update(it.row.code, { mode: e.target.value as StudioMode, processed: null, status: 'idle', message: undefined })
                          }
                          className="h-9 rounded-lg border border-line-strong bg-white px-2 text-xs text-ink"
                        >
                          <option value="studio">Clean background</option>
                          <option value="original">Keep original</option>
                        </select>
                        <StatusChip status={errors.length ? 'invalid' : it.status} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6 xl:sticky xl:top-8 xl:self-start">
          <Panel title="How it works">
            <div className="flex flex-col gap-4">
              <Step n={1} title="Download the template">
                <Button size="sm" variant="outline" className="mt-2" onClick={() => downloadTemplate()}>
                  <Download className="size-4" /> Excel template
                </Button>
              </Step>
              <Step n={2} title="Fill one row per pair">
                Give each pair a short <b>Code</b> (01, 02, 03…) plus brand, name, size, grade, condition and price.
              </Step>
              <Step n={3} title="Name the photos by Code">
                Put each pair&apos;s photos in a folder named with its code (folder <b>01</b>), or name the files{' '}
                <b>01-1.jpg</b>, <b>01-2.jpg</b>… At least {MIN_PRODUCT_IMAGES} photos per pair.
              </Step>
              <Step n={4} title="Choose the files above, review, import">
                The first photo becomes the cover.
              </Step>
            </div>
          </Panel>

          <Panel title="Options">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold text-ink">Photo background</legend>
              {(
                [
                  ['studio', 'Clean studio background', 'Removes the background and places the pair on a soft light-grey backdrop.'],
                  ['original', 'Keep original photos', 'Only crops them to the same shape.'],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors',
                    defaultMode === value ? 'border-sand bg-sand-100/50' : 'border-line hover:border-line-strong',
                  )}
                >
                  <input
                    type="radio"
                    name="bg-mode"
                    className="mt-1 accent-sand"
                    checked={defaultMode === value}
                    disabled={!!busy}
                    onChange={() => setModeAll(value)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{label}</span>
                    <span className="block text-xs text-ink-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink">
              <input type="checkbox" className="mt-0.5 size-4 accent-sand" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              <span>
                Publish pairs with {MIN_PRODUCT_IMAGES}+ photos straight away
                <span className="block text-xs text-ink-muted">Untick to import everything as drafts.</span>
              </span>
            </label>
            {modelState === 'loading' && (
              <p className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
                <Loader2 className="size-3.5 animate-spin" /> Loading the background remover (first time only, ~5 MB)…
              </p>
            )}
            {modelState === 'failed' && (
              <Alert tone="error" className="mt-4">
                The background remover could not load, so photos will keep their original background.
              </Alert>
            )}
          </Panel>

          {items.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Pairs" value={items.length} note={`${photoCount} photos`} />
                <StatTile
                  label="Need fixing"
                  value={items.length - valid.length}
                  tone={items.length - valid.length ? 'attention' : 'default'}
                />
                <StatTile label="Ready" value={pending.length} />
                <StatTile label="Imported" value={done.length} />
              </div>

              <div className="rounded-xl border border-line bg-surface-raised p-4 shadow-card">
                {busy && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium text-ink-muted">
                      <span>{busy === 'processing' ? 'Cleaning photos…' : 'Importing…'}</span>
                      <span className="tabular-nums">
                        {progress.done} / {progress.total}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken">
                      <div
                        className="h-full rounded-full bg-sand transition-[width] duration-300"
                        style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  loading={busy === 'importing'}
                  disabled={!!busy || !pending.length || !env.isSupabaseConfigured}
                  onClick={importAll}
                >
                  <Sparkles className="size-4" /> Import {pending.length} {pending.length === 1 ? 'pair' : 'pairs'}
                </Button>
                {busy && (
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => (stop.current = true)}>
                    Stop after this pair
                  </Button>
                )}
                {!busy && done.length > 0 && (
                  <Link
                    to={paths.admin.products}
                    className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-sand hover:underline"
                  >
                    <CheckCircle2 className="size-4" /> View imported products
                  </Link>
                )}
                <p className="mt-3 text-xs text-ink-subtle">
                  Keep this tab open while importing. Rows that fail stay here so you can fix them and import again.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: ItemStatus | 'invalid' }) {
  const map = {
    invalid: ['Fix in sheet', 'border-danger/25 bg-danger/10 text-danger'],
    idle: ['Ready', 'border-line bg-surface-sunken text-ink-muted'],
    processing: ['Cleaning…', 'border-sand/25 bg-sand/10 text-sand'],
    ready: ['Photos ready', 'border-sand/25 bg-sand/10 text-sand'],
    importing: ['Importing…', 'border-sand/25 bg-sand/10 text-sand'],
    done: ['Imported', 'border-success/25 bg-success/10 text-success'],
    error: ['Failed', 'border-danger/25 bg-danger/10 text-danger'],
  } as const
  const [label, cls] = map[status]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap', cls)}>
      {(status === 'processing' || status === 'importing') && <Loader2 className="size-3 animate-spin" />}
      {label}
    </span>
  )
}

