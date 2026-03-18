# Event Formulation Principles

Use this reference when creating or reviewing event types and payloads.

## Core Model

For application code, a new event consists only of:
- `eventType`
- `payload`

Treat everything else as store-managed infrastructure metadata.

## Technical Metadata Is Not Business Meaning

- `sequenceNumber` is technical ordering metadata.
- `timestamp` is technical audit/protocol metadata.
- Neither is part of the business meaning of an event.
- Do not base business decisions on `timestamp` when reading events.
- Do not treat `sequenceNumber` as the application's event identity.

In `SupabaseEventStore`, `tenantId` or user binding is also infrastructure context:
- it is set when the store is constructed
- it is not part of normal `append`, `query`, or `subscribe` usage
- it is not queried explicitly in normal application code

## Event Type Naming

`eventType` must:
- be `camelCase`
- be written in past tense
- describe a fact that has already happened

Examples:
- `userRegistered`
- `gameStarted`
- `studentEnrolledInCourse`

Avoid:
- command-like names such as `registerUser`
- future or intent-oriented names
- `PascalCase` names such as `UserRegistered`

## Required Event ID

Every event must carry its own business-level event ID in the payload, unless that rule is explicitly disabled for a specific case.

Purpose:
- identify the event from the application's perspective
- keep business identity separate from the store's technical `sequenceNumber`

Default naming rule:
- the ID field name is `<eventType>Id`

Examples:

```ts
{
  eventType: 'userRegistered',
  payload: {
    userRegisteredId: '0d64f07c-22b9-4c74-b9ee-1bd1c95a5f31',
    email: 'user@example.com'
  }
}
```

Default format:
- UUID

Allowed exception:
- a different field name or ID format may be used when explicitly intended
- it still must be unique

## No Aggregate or Entity Assumption

This skill does not assume that Event Sourcing is organized around aggregates, entities, or aggregate streams.

Important consequences:
- do not introduce aggregate IDs by default
- do not assume two events are related because they belong to the same aggregate
- do not force DDD framing onto event design

Events may still reference identifiers from outside the event store, for example:
- a university matriculation number
- an external user ID
- a course ID from another system

Those are external references, not aggregate identities.

## Scopes

Events can belong to one or more scopes.

Meaning:
- a later event can explicitly state that it happened in the scope opened by an earlier event
- this models internal relationships between events directly

Examples:
- `gameFinished` belongs to the scope opened by `gameStarted`
- `studentEnrolledInCourse` can belong to both the `studentRegistered` scope and the `coursePublished` scope

## Scope Encoding

Scopes are stored in:

```ts
payload.scopes
```

Rules:
- `scopes` is optional
- omit it when an event belongs to no scope
- `scopes` is a record, not an array
- each key is the event-ID field name of a scope root
- each value is the concrete ID of that root event

Example:

```ts
{
  eventType: 'gameFinished',
  payload: {
    gameFinishedId: '987',
    scopes: {
      gameStartedId: '123'
    }
  }
}
```

Multiple scopes:

```ts
{
  eventType: 'studentEnrolledInCourse',
  payload: {
    studentEnrolledInCourseId: 'abc',
    scopes: {
      studentRegisteredId: '373',
      coursePublishedId: 'dj2'
    }
  }
}
```

## Scope Rules

- An event never includes its own event ID again inside `scopes`.
- If an event is referenced through `scopes` by later events, it functions as the root of that scope.
- When an event joins a scope, copy known higher-level scopes into its own `scopes` as well.

Reason:
- higher-level scope queries become simpler and more efficient
- deeper nested events remain directly queryable through the broader scope roots

Example:

```ts
{
  eventType: 'studentGraded',
  payload: {
    studentGradedId: 'xyz',
    scopes: {
      studentEnrolledInCourseId: 'abc',
      studentRegisteredId: '373',
      coursePublishedId: 'dj2'
    }
  }
}
```

## Conceptual Note

This event relationship model is based on scopes and event-to-event references, not on aggregate membership.

Keep that distinction explicit in code reviews and generated code.
