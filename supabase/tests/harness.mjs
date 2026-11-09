// Shared test harness: a fresh PGlite Postgres with Supabase-like auth/storage stubs,
// every migration applied in order, the seed, and per-role session helpers.
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export async function createTestDb({ quiet = false } = {}) {
  const db = new PGlite({ extensions: { pg_trgm, pgcrypto } })

  // ── Supabase platform stubs ──────────────────────────────────────────────
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema extensions; grant usage on schema extensions to anon, authenticated;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create schema storage; grant usage on schema storage to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant all on storage.objects to anon, authenticated;
    -- Supabase default privileges on public
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
  `)

  // Each migration runs as its own transaction, like `supabase db push`.
  const migDir = path.join(root, 'supabase/migrations')
  for (const f of fs.readdirSync(migDir).sort()) {
    try {
      await db.exec(fs.readFileSync(path.join(migDir, f), 'utf8'))
    } catch (e) {
      console.error('MIGRATION FAILED', f, e.message)
      process.exit(1)
    }
    if (!quiet) console.log('✓ migration', f)
  }
  await db.exec(fs.readFileSync(path.join(root, 'supabase/seed.sql'), 'utf8'))

  let pass = 0
  let fail = 0
  const ok = (name, cond, extra = '') => {
    if (cond) pass++
    else fail++
    console.log(`${cond ? '  PASS' : '  FAIL'}  ${name}${extra ? '  → ' + extra : ''}`)
  }
  /** Switch session to a user id, 'anon' or 'postgres' (superuser, bypasses RLS). */
  const as = async (who) => {
    await db.exec('reset role')
    if (who === 'postgres') return db.exec(`select set_config('request.jwt.claim.sub', '', false)`)
    await db.exec(`select set_config('request.jwt.claim.sub', '${who === 'anon' ? '' : who}', false)`)
    await db.exec(`set role ${who === 'anon' ? 'anon' : 'authenticated'}`)
  }
  const q = async (sql, params) => (await db.query(sql, params)).rows
  const err = async (sql, params) => {
    try {
      await db.query(sql, params)
      return null
    } catch (e) {
      return e
    }
  }
  const mkUser = async (email, meta = {}) =>
    (await q(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify(meta)]))[0].id
  const done = () => {
    console.log(`\n${pass} passed, ${fail} failed`)
    return fail
  }

  return { db, ok, as, q, err, mkUser, done }
}
