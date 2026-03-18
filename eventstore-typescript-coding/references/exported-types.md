# Exported EventStore Types

Source:
- `src/eventstore/types.ts` from `ricofritzsche/eventstore-typescript`
- Retrieved on 2026-03-16 from:
  `https://raw.githubusercontent.com/ricofritzsche/eventstore-typescript/refs/heads/main/src/eventstore/types.ts`

Use this file as the contract source of truth when implementing or reviewing code.

## Interfaces

```ts
export interface Event {
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
}

export interface EventRecord extends Event {
  readonly sequenceNumber: number;
  readonly timestamp: Date;
}

export interface EventFilter {
  readonly eventTypes: string[];
  readonly payloadPredicates?: Record<string, unknown>[];
}

export interface QueryOptions {
  readonly minSequenceNumber?: number;
}

export interface EventQuery {
  readonly filters: EventFilter[];
  readonly options?: QueryOptions;
}

export interface QueryResult {
  events: EventRecord[];
  maxSequenceNumber: number;
}

export interface EventStore {
  query(filterCriteria: EventQuery): Promise<QueryResult>;
  query(filterCriteria: EventFilter): Promise<QueryResult>;

  append(events: Event[]): Promise<void>;
  append(events: Event[], filterCriteria: EventQuery, expectedMaxSequenceNumber: number): Promise<void>;
  append(events: Event[], filterCriteria: EventFilter, expectedMaxSequenceNumber: number): Promise<void>;
  
  subscribe(handle: HandleEvents): Promise<EventSubscription>;
}

export type HandleEvents = (events: EventRecord[]) => Promise<void>;

export interface EventSubscription {
  readonly id: string;
  unsubscribe(): Promise<void>;
}

export interface Subscription {
  id: string;
  handle: HandleEvents;
}

export interface EventStreamNotifier {
  subscribe(handle: HandleEvents): Promise<EventSubscription>;
  notify(events: EventRecord[]): Promise<void>;
  close(): Promise<void>;
}
```

## Coding Implications

- Append new data as `Event[]`, not `EventRecord[]`.
- Expect `query(...)` to return both `events` and `maxSequenceNumber`.
- Expect `subscribe(...)` handlers to receive batches.
- Use `EventStreamNotifier` only for notification infrastructure, not as the persistence API.
- Use `EventFilter` directly when simple filtering is enough, or `EventQuery` when multiple filters and options are needed.

## Review Checklist

- Verify event objects have `eventType` and `payload`.
- Verify guarded appends pass the same business-context filter/query used to compute `expectedMaxSequenceNumber`.
- Verify query consumers handle `maxSequenceNumber`, especially when implementing retries or checkpointing.
- Verify timestamp and sequence number are treated as store-provided data.
