# EventStore Core Reference

Source:
- `README.md` from `ricofritzsche/eventstore-typescript`
- Retrieved on 2026-03-16 from:
  `https://raw.githubusercontent.com/ricofritzsche/eventstore-typescript/refs/heads/main/README.md`

## Purpose

Use this reference for the core library behavior, recommended patterns, and the documented APIs around Postgres, Memory, subscriptions, and optimistic locking.

## Supported Store Variants

- `PostgresEventStore`: persistent PostgreSQL-backed event store
- `MemoryEventStore`: in-memory store with optional file persistence
- `SupabaseEventStore`: separate store documented in `supabase-eventstore.md`

## Core Capabilities

- Immutable event storage
- Historical querying with `EventQuery`
- Optimistic locking based on a filtered event context
- Automatic notification of subscribers after appends
- Pluggable notifier implementations through `EventStreamNotifier`

## Query Patterns

Use `createFilter(eventTypes, payloadPredicates?)` to define one filter:
- `eventTypes` are OR
- `payloadPredicates` are OR
- the event type condition and payload condition are combined as part of the same filter

Use `createQuery(...filters)` to OR multiple filters together.

Example shape:

```ts
const userFilter = createFilter(
  ['UserRegistered', 'UserEmailVerified'],
  [{ userId: '123' }]
);

const adminFilter = createFilter(
  ['AdminAction'],
  [{ action: 'user_management' }]
);

const query = createQuery(userFilter, adminFilter);
const result = await eventStore.query(query);
```

Use incremental loading with `minSequenceNumber` when the application tracks checkpoints:

```ts
const query = createQuery(
  { minSequenceNumber: 42 },
  createFilter(['UserRegistered', 'UserEmailVerified'])
);
```

Note:
- The README shows this `createQuery` usage pattern for incremental loading.
- The exported `EventQuery` type models incremental loading through `options.minSequenceNumber`.
- Prefer the exported type shape when authoring type-safe code and align with any helper implementation already present in the codebase.

## Optimistic Locking Pattern

Use optimistic locking for context-specific consistency:

1. Build a filter/query for the business context to protect.
2. Query the current state.
3. Read `maxSequenceNumber`.
4. Append with the same filter/query plus `expectedMaxSequenceNumber`.

Example:

```ts
const accountQuery = createQuery(
  createFilter(
    ['BankAccountOpened', 'MoneyDeposited', 'MoneyWithdrawn'],
    [{ accountId: 'acc-123' }]
  )
);

const currentState = await eventStore.query(accountQuery);
await eventStore.append(accountEvents, accountQuery, currentState.maxSequenceNumber);
```

Meaning:
- Conflicts are checked only against the relevant event context.
- The Postgres implementation uses a CTE-based atomic check-and-insert strategy.

## Subscription Pattern

Subscribe with a handler that receives `EventRecord[]`:

```ts
const subscription = await eventStore.subscribe(async (events) => {
  for (const event of events) {
    switch (event.eventType) {
      case 'BankAccountOpened':
        await updateAccountProjection(event);
        break;
    }
  }
});
```

Use subscriptions for:
- read-model projections
- analytics updates
- notifications and workflows

The README describes subscribers as concurrent and isolated: one subscriber failing should not stop others.

## MemoryEventStore Notes

Use `MemoryEventStore` for:
- tests
- local spikes
- simple prototypes

Persistence options documented in the README:
- `storeToFile("events.json")`
- `MemoryEventStore.createFromFile("events.json")`
- write-through mode when constructed with a file path

## Practical Coding Guidance

- Inject the event store behind app services instead of hardcoding store construction deep inside domain logic.
- Keep domain event creation explicit and local to use cases.
- Treat projections as consumers of `EventRecord` values, not as part of append logic.
- When typing domain events more strongly, build app-level wrappers on top of the library's generic `Event` interface.
