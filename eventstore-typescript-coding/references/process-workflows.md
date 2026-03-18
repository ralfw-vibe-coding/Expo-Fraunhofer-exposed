# Request Processor Workflows

Use this reference when implementing the inside of `process()` for command and query processors.

## Design Goal

`process()` orchestrates a small number of explicit phases.

Do not hide the workflow in one large block.
Implement each phase as its own private function inside the processor module.

Typical processor shape:

```ts
class SomeCommandProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(request: SomeCommand): Promise<SomeCommandResponse> {
    // orchestrate phases
  }

  private checkPlausibility(request: SomeCommand): void {
    // ...
  }

  private async loadContext(request: SomeCommand): Promise<QueryResult> {
    // ...
  }

  private buildContextModel(context: EventRecord[]): SomeContextModel {
    // ...
  }

  private validate(request: SomeCommand, contextModel: SomeContextModel): CommandResponse | null {
    // ...
  }

  private createEvents(request: SomeCommand, contextModel: SomeContextModel): Event[] {
    // ...
  }
}
```

## Command Workflow

Inside `process()`, implement commands in this order:

1. plausibility check
2. load context
3. build context model
4. validate against context model
5. create new events
6. append new events

## Phase 1: Plausibility Check

This is a local check on the request itself.

Purpose:
- reject obviously malformed or nonsensical input early
- avoid unnecessary event-store reads

Examples:
- missing required fields
- impossible value shapes
- broken local invariants that do not require event history

This is not the full business validation yet.

## Phase 2: Load Context

Load all events that are relevant for deciding:
- whether the command may run
- how it should run

The context is event history, not yet a compact decision model.

Choose the query around the actual business context that matters for this request.

## Phase 3: Build Context Model

Project the loaded events into a compact `context model`.

Purpose:
- extract only the data essence needed for the remaining processing
- keep later logic short and readable

The `context model` may be:
- one number
- one boolean plus a few IDs
- a deep nested object graph

Choose the smallest shape that helps the command logic.

## Phase 4: Validate Against Context Model

This is the real business validation step.

Use the `context model` to decide whether the command is allowed.

If the command cannot be applied because of the current context:
- return a normal negative command status
- do not throw an exception for expected business failure

Examples:
- the action is no longer allowed
- prerequisites are missing
- the current state has become inconsistent with the request

## Phase 5: Create Events

If validation succeeds, create the new events to append.

Use the already-built `context model` as working data.
The command may also modify the `context model` during this phase if that is useful.

Important:
- the `context model` is temporary
- it is local to one request
- it is not a durable model
- do not over-optimize around it prematurely

## Phase 6: Append Events

Append the newly created events to the store.

Sometimes a plain append is enough.
Sometimes a conditional append is required.

Conditional append means:
- reuse the context query or filter
- reuse the `maxSequenceNumber` from the original context load
- let the store detect whether relevant concurrent changes happened

Use conditional append when unnoticed changes between context loading and writing could invalidate the command result.

Think about the command's business meaning:
- what state is being changed?
- could someone else plausibly change the same relevant context concurrently?
- would such a change matter for the correctness of the new events?

Example guidance:
- `gameStarted`: often less likely to need conditional append
- `gameFinished`: more likely to need conditional append

Expected consistency conflicts remain normal command failures, not exceptions.

## Query Workflow

Inside `process()`, implement queries in this order:

1. plausibility check
2. load context
3. build context model
4. project context model into result model

## Query Phase Details

### Plausibility Check

Use the same idea as for commands:
- reject obviously malformed input early
- keep it local to the request data

### Load Context

Load the relevant event history for the requested read.

### Build Context Model

Project the raw events into the compact shape that best supports the read logic.

### Project Result Model

Transform the `context model` into the externally returned `result model`.

Reason:
- the best internal working shape is not always the best response shape
- the query may need different grouping, filtering, or summarization for the caller

## Success and Failure Rules

Commands:
- expected business rejection returns a negative status response
- technical failure throws an exception

Queries:
- empty or missing data is still a successful query result
- technical failure throws an exception

## Review Checklist

- Is `process()` clearly broken into phases?
- Does each phase have its own private helper?
- Is the context loaded before business validation?
- Is validation based on a context model rather than raw ad-hoc event scanning everywhere?
- Are new events created only after successful validation?
- Is conditional append used where concurrent context changes matter?
- Does the query return a result model rather than leaking raw event history by default?
