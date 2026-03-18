# Supabase EventStore Reference

Source:
- `src/eventstore/stores/supabase/README.md` from `ricofritzsche/eventstore-typescript`
- Retrieved on 2026-03-16 from:
  `https://raw.githubusercontent.com/ricofritzsche/eventstore-typescript/refs/heads/main/src/eventstore/stores/supabase/README.md`

Use this reference only for Supabase-specific tasks.

## Purpose

`SupabaseEventStore` persists events in a Supabase Postgres table and targets browser-based SPA applications.

Supported modes:
- shared stream with `tenant_id = NULL`
- tenant-scoped stream with a fixed `tenantId`
- realtime subscriptions through Supabase Realtime

## Mode Selection

### Shared stream

Use when the app has one global stream:
- omit `tenantId`
- rows are read and written with `tenant_id = NULL`

### Tenant-scoped stream

Use when each store instance should only see one tenant/user stream:
- set `tenantId` once in the constructor
- `query`, `append`, and realtime subscription are scoped to that tenant

Prefer this mode for multi-tenant apps.

## Setup SQL

Generate the setup SQL with `createSupabaseSetupSql(...)`:

```ts
import { createSupabaseSetupSql } from '@ricofritzsche/eventstore';

const sql = createSupabaseSetupSql({
  tableName: 'events_spa',
  schemaName: 'public',
  appendFunctionName: 'eventstore_append',
});
```

Defaults:
- `schemaName`: `public`
- `appendFunctionName`: `eventstore_append`

CLI alternative from the upstream repository:

```bash
npm run supabase:sql -- --table events_spa
```

The generated SQL creates:
- event table with `tenant_id`
- indexes
- RLS policies
- append RPC function

## Construction Examples

Shared stream:

```ts
const store = new SupabaseEventStore({
  supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
  tableName: 'events_spa',
});
```

Tenant-scoped:

```ts
const store = new SupabaseEventStore({
  supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
  tableName: 'events_spa',
  tenantId: '2a8e7f57-9f62-4dc2-b8ef-a9a0bca53f9e',
});
```

Connection-string style:

```ts
const store = new SupabaseEventStore({
  connectionString:
    'https://YOUR_PROJECT_ID.supabase.co?anonKey=YOUR_ANON_KEY&table=events_spa&schema=public&tenantId=2a8e7f57-9f62-4dc2-b8ef-a9a0bca53f9e',
});
```

## Auth and Tenant ID

The README recommends using the authenticated user id as `tenantId` in many setups:

```ts
const { data } = await supabase.auth.getUser();
const tenantId = data.user?.id;
```

Important security guidance:
- use only the anon/public key in browser apps
- never ship the service-role key to frontend code

## RLS Guidance

The generated SQL enables RLS and basic authenticated policies, but application security must still be enforced by proper RLS rules.

Treat `tenantId` scoping in code as convenience and consistency, not as the actual security boundary.

## Testing Notes

The upstream repo documents a real Supabase integration scenario using environment variables such as:
- `SUPABASE_TEST_URL`
- `SUPABASE_TEST_KEY`
- `SUPABASE_TEST_TABLE`
- `SUPABASE_TEST_SCHEMA`
- `SUPABASE_TEST_APPEND_FUNCTION`
- tenant login credentials for isolation scenarios

Use these details as inspiration when adding integration tests in another project, but adapt names and secrets handling to the local repository.
