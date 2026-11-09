/**
 * CSV and Excel export. Excel uses write-excel-file (MIT), loaded on demand so it
 * never ships in the main bundle.
 */
export type ColumnKind = 'text' | 'money' | 'number' | 'date' | 'percent'

export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
  kind?: ColumnKind
  width?: number
}

export interface ExportSheet<T = unknown> {
  name: string
  columns: ExportColumn<T>[]
  rows: T[]
}

/** A sheet with its row type erased, so sheets of different shapes can travel together. */
export type AnySheet = ExportSheet<unknown>

/** Type-checks columns against rows, then erases the row type. */
export const sheet = <T>(s: ExportSheet<T>): AnySheet => s as unknown as AnySheet

/** Neutralise spreadsheet formula injection (cells starting with = + - @ tab or CR). */
const safeText = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s)

function csvCell(v: string | number | null | undefined, kind: ColumnKind = 'text') {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && kind !== 'text') return String(v)
  const s = safeText(String(v))
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toCsv<T>(sheet: ExportSheet<T>): string {
  const head = sheet.columns.map((c) => csvCell(c.header)).join(',')
  const body = sheet.rows.map((r) => sheet.columns.map((c) => csvCell(c.value(r), c.kind)).join(','))
  return [head, ...body].join('\r\n')
}

/** CSV with a UTF-8 BOM so Excel opens "₨"/Urdu text correctly. One sheet per file. */
export function exportCsv(filename: string, one: AnySheet) {
  const BOM = String.fromCharCode(0xfeff)
  download(new Blob([BOM + toCsv(one)], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

const FORMAT: Partial<Record<ColumnKind, string>> = {
  money: '#,##0.00',
  number: '#,##0',
  percent: '0.0%',
  date: 'yyyy-mm-dd',
}

/** Real .xlsx with one worksheet per sheet, bold headers and numeric formats. */
export async function exportXlsx(filename: string, sheets: AnySheet[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const data = sheets.map((sheet) => ({
    sheet: sheet.name.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '),
    columns: sheet.columns.map((c) => ({ width: c.width ?? (c.kind === 'text' || !c.kind ? 24 : 14) })),
    data: [
      sheet.columns.map((c) => ({ value: c.header, fontWeight: 'bold' as const })),
      ...sheet.rows.map((r) =>
        sheet.columns.map((c) => {
          const v = c.value(r)
          if (v === null || v === undefined || v === '') return null
          if (c.kind === 'date' && typeof v === 'string') {
            const d = new Date(v.length === 10 ? `${v}T00:00:00Z` : v)
            return Number.isNaN(d.getTime())
              ? { value: v, type: String }
              : { value: d, type: Date, format: FORMAT.date }
          }
          if (typeof v === 'number') return { value: v, type: Number, format: FORMAT[c.kind ?? 'number'] }
          return { value: safeText(String(v)), type: String }
        }),
      ),
    ],
  }))
  await writeXlsxFile(data).toFile(`${filename}.xlsx`)
}
