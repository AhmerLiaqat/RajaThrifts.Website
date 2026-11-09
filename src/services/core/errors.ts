import type { AuthError, PostgrestError } from '@supabase/supabase-js'

export type ServiceErrorCode =
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'OUT_OF_STOCK'
  | 'NOT_CONFIGURED'
  | 'NETWORK'
  | 'UNKNOWN'

/** The one error type the UI ever sees from the data layer. */
export class ServiceError extends Error {
  readonly code: ServiceErrorCode
  readonly cause?: unknown

  constructor(code: ServiceErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.cause = cause
  }
}

/**
 * Maps Postgres / PostgREST errors to app-level codes.
 * SQLSTATEs raised by our functions are documented in 20261109000500_functions.sql.
 */
export function fromPostgrestError(error: PostgrestError): ServiceError {
  if (error.hint === 'OUT_OF_STOCK') return new ServiceError('OUT_OF_STOCK', error.message, error)
  // supabase-js surfaces fetch failures (offline, DNS, CORS, project paused) as an error with no SQLSTATE.
  if (!error.code && /fetch|network|load failed/i.test(error.message)) {
    return new ServiceError(
      'NETWORK',
      'We can’t reach the store right now. Check your connection and try again.',
      error,
    )
  }

  const map: Record<string, ServiceErrorCode> = {
    PGRST116: 'NOT_FOUND', // .single() returned no rows
    P0002: 'NOT_FOUND', // raised by our functions
    '23505': 'CONFLICT', // unique_violation
    '23503': 'CONFLICT', // foreign_key_violation (e.g. brand still in use)
    '23514': 'VALIDATION', // check_violation
    '22023': 'VALIDATION', // invalid_parameter_value (our functions)
    '22P02': 'VALIDATION', // invalid text representation (bad uuid / number)
    '42501': 'FORBIDDEN', // RLS / insufficient_privilege / our role checks
  }
  const code = map[error.code] ?? 'UNKNOWN'
  return new ServiceError(code, friendlyMessage(code, error), error)
}

function friendlyMessage(code: ServiceErrorCode, error: PostgrestError) {
  // Messages raised by our own functions are already customer-friendly.
  if (['P0002', '22023', '42501'].includes(error.code) && !error.message.startsWith('new row violates'))
    return error.message
  if (code === 'CONFLICT' && error.message.includes('slug'))
    return 'That URL slug is already used by another product.'
  if (code === 'CONFLICT' && error.message.includes('sku'))
    return 'That SKU is already used by another size or product.'
  if (code === 'CONFLICT') return 'This conflicts with an existing record.'
  if (code === 'FORBIDDEN') return 'You do not have permission to do that.'
  if (code === 'VALIDATION') return 'Some of the values are not valid. Please check the form and try again.'
  return error.message
}

export function fromAuthError(error: AuthError): ServiceError {
  const message = error.message || 'Authentication failed'
  if (error.status === 400 || error.status === 401 || error.code === 'invalid_credentials')
    return new ServiceError('UNAUTHORIZED', message, error)
  if (error.status === 422 || error.code === 'user_already_exists' || error.code === 'weak_password')
    return new ServiceError('VALIDATION', message, error)
  if (error.status === 429)
    return new ServiceError('VALIDATION', 'Too many attempts. Please wait a minute and try again.', error)
  return new ServiceError('UNKNOWN', message, error)
}

/**
 * Unwraps a Supabase `{ data, error }` response or throws a ServiceError.
 * Pass the expected row type explicitly (the client is not generic-typed).
 */
export function unwrap<T>(res: { data: unknown; error: PostgrestError | null }): T {
  if (res.error) throw fromPostgrestError(res.error)
  if (res.data == null) throw new ServiceError('NOT_FOUND', 'Resource not found')
  return res.data as T
}

/** Like unwrap, but for list/void responses where null data is fine. */
export function check(res: { error: PostgrestError | null }): void {
  if (res.error) throw fromPostgrestError(res.error)
}
