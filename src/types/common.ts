/** ISO-8601 timestamp string as returned by Supabase/Postgres. */
export type ISODateString = string

/** UUID primary key. */
export type ID = string

/**
 * Money is stored as an integer in the smallest currency unit
 * (e.g. paisa for PKR) to avoid floating-point rounding errors.
 */
export type MinorUnits = number

export interface Timestamps {
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface PageParams {
  page?: number
  pageSize?: number
}

export type SortDirection = 'asc' | 'desc'
