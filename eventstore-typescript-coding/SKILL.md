---
name: eventstore-typescript-coding
description: Write, refactor, review, and test TypeScript code that uses `@ricofritzsche/eventstore`. Use when Codex needs to implement event-sourced application code, wire `PostgresEventStore`, `MemoryEventStore`, or `SupabaseEventStore`, create queries and optimistic-locking appends, add subscriptions/projections, or verify that code follows the exported EventStore interfaces without inventing unsupported APIs.
---

# EventStore TypeScript Coding

## Overview

Implement application code against `@ricofritzsche/eventstore` with the exact exported contracts and the patterns documented by the library.
Prefer small, explicit event-sourced shells around pure domain logic, and stay within the library's real API surface.

## Workflow

1. Read [references/eventstore-core.md](references/eventstore-core.md) before changing code that uses the core store APIs.
2. Read [references/exported-types.md](references/exported-types.md) when signatures, overloads, or object shapes matter.
3. Read [references/event-principles.md](references/event-principles.md) when creating, naming, or reviewing event payloads and event relationships.
4. Read [references/request-processing.md](references/request-processing.md) when implementing or refactoring commands, queries, processors, request types, or response types.
5. Read [references/supabase-eventstore.md](references/supabase-eventstore.md) only when the task involves browser/SPA usage, tenant scoping, Supabase SQL setup, or realtime subscriptions.
6. Inspect the local codebase for the existing event names, processor layout, projections, and dependency injection patterns before writing code.
7. Do not introduce aggregate/entity/stream modeling unless the local codebase already does so intentionally and the task explicitly requires working within it.
8. Implement the narrowest change that matches the documented API, the event principles, and the local architecture.
9. Validate by compiling or testing the touched code when feasible.

## Implementation Rules

- Use only documented and exported concepts: `Event`, `EventRecord`, `EventFilter`, `EventQuery`, `QueryResult`, `EventStore`, `EventSubscription`, and `EventStreamNotifier`.
- Model new events as `{ eventType, payload }` objects. Treat stored records as `EventRecord` values with `sequenceNumber` and `timestamp`.
- When authoring events, follow the principles in [references/event-principles.md](references/event-principles.md): past-tense `camelCase` names, required event IDs in payload, and optional `scopes` records for scope membership.
- Use `createFilter(...)` and `createQuery(...)` for queries when available in the codebase. Keep the documented semantics straight:
  `eventTypes` are OR, `payloadPredicates` are OR, filters inside `EventQuery.filters` are OR.
- Use optimistic locking only through the documented append overloads:
  `append(events)`, `append(events, eventQuery, expectedMaxSequenceNumber)`, or `append(events, eventFilter, expectedMaxSequenceNumber)`.
- Derive `expectedMaxSequenceNumber` from a preceding `query(...)` call on the same protected business context.
- Subscribe with `subscribe(handle)` when building projections, analytics, or side effects. Expect the handler to receive `EventRecord[]`, not single events.
- Keep subscriber work idempotent when possible, because the skill may be asked to implement rebuilds or retries around projections.
- Prefer `MemoryEventStore` for tests, spikes, and local prototypes; prefer `PostgresEventStore` for server persistence; prefer `SupabaseEventStore` for browser/SPAs and tenant-scoped streams.
- Implement request handling according to [references/request-processing.md](references/request-processing.md): one processor per request type, one module per processor, explicit request/response types, and `process()` as the main entrypoint.
- Structure `process()` as a phase-oriented workflow with private helper functions for each phase instead of one large implementation block.
- Do not invent aggregate repositories, aggregate IDs, stream-version fields, per-aggregate APIs, or entity-centric modeling unless the local codebase already adds them on top of the library.
- Do not assume event payload typing is enforced by the package itself; add local TypeScript wrappers or discriminated unions in app code if stronger typing is needed.

## Common Tasks

### Add Domain Behavior

- Keep domain decisions pure where possible.
- Translate domain results into event arrays.
- Append those events through the injected store.
- Query prior events for the same business context before guarded appends.
- Return command responses as status objects, not as exceptions for expected consistency conflicts.
- Build a temporary `context model` from loaded events before validating or producing new events.
- Use conditional append when concurrent changes to the loaded context could invalidate the command result.

### Build Projections or Listeners

- Subscribe before appending when the task depends on receiving newly written events in-process.
- Iterate over `EventRecord[]` in the handler and branch by `eventType`.
- Update read models and analytics outside the event store itself.

### Implement Queries

- Use `createFilter([...], [...])` for one logical filter.
- Use `createQuery(filterA, filterB, ...)` for OR across business cases.
- Use `options.minSequenceNumber` for incremental loading when the codebase tracks checkpoints.
- Treat empty query results as successful reads, not as command-style failure states.
- Build a `context model` first and then project that into the returned `result model`.

### Implement Supabase Variants

- Generate setup SQL with `createSupabaseSetupSql(...)` when the task involves schema setup.
- Use `tenantId` for tenant-scoped streams and remember that RLS still enforces actual data security.
- Use only the Supabase anon/public key in browser code, never the service-role key.

## Guardrails

- Do not claim support for APIs that are not present in [references/exported-types.md](references/exported-types.md).
- Do not bypass optimistic locking by hardcoding guessed sequence numbers.
- Do not mix tenant-scoped and shared-stream assumptions in Supabase code.
- Do not put infrastructure concerns into pure domain modules unless the local codebase already follows that pattern.
- Do not treat `timestamp` or `sequenceNumber` as part of the business meaning of an event.
- Do not assume Event Sourcing implies aggregates or entities in this skill's model; it starts with events and their relationships.

## References

- Core store usage: [references/eventstore-core.md](references/eventstore-core.md)
- Exported contracts: [references/exported-types.md](references/exported-types.md)
- Event formulation principles: [references/event-principles.md](references/event-principles.md)
- Command and query processing: [references/request-processing.md](references/request-processing.md)
- Detailed `process()` workflows: [references/process-workflows.md](references/process-workflows.md)
- Supabase store details: [references/supabase-eventstore.md](references/supabase-eventstore.md)
