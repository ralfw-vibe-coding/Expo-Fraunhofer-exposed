# Command and Query Processing

Use this reference when implementing request handling around the event store.

For the detailed inner workflow of `process()`, also read [process-workflows.md](process-workflows.md).

## CQS

Requests follow the CQS principle:
- `Command`: changes the event store
- `Query`: reads from the event store without changing it

If a request modifies stored events or appends new events, it is a command.
If a request only reads existing events, it is a query.

## Processor Model

Each request is handled by its own processor.

Structure:
- one request type per use case
- one processor per request type
- one processor module per file

In object-oriented languages such as TypeScript, a class is a good fit.

The processor is one of the main structural units of the codebase and should be easy to scan when opening the project.

Examples:
- `RegisterStudentCommand`
- `RegisterStudentCommandProcessor`
- `ListCoursesQuery`
- `ListCoursesQueryProcessor`

## Dependency Injection

Inject the event store into the processor constructor.

Typical shape:

```ts
class RegisterStudentCommandProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(request: RegisterStudentCommand): Promise<RegisterStudentCommandResponse> {
    // ...
  }
}
```

## Request and Response Types

Define explicit request types and explicit response types.

Use a separate request type for each command or query.
Use a separate response type for each command or query.

This keeps processing uniform and reviewable.

## Command Responses

The response of a command is a status-oriented result.

Default shape:

```ts
type CommandResponse = {
  status: boolean;
  message: string;
};
```

Possible extensions:
- created event ID
- number of deleted items
- other command-specific metadata

The main role of the response is to express whether processing succeeded in the expected business sense.

## Expected Failure vs Exception

Expected business-level failure in a command is not an exception.

Example:
- optimistic-lock conflict
- inconsistent current state
- command cannot be applied under current event history

Represent these outcomes in the returned status response.

Exceptions are for technical failure, for example:
- storage unavailable
- connectivity issue
- unexpected infrastructure error
- serialization or programming error

This rule applies to commands and queries.

## Query Responses

The response of a query is a result object containing the requested data.

If the requested data is absent, that is still a successful query.

Meaning:
- empty result sets are not failures
- "nothing found" is not a command-style negative status
- technical failures still surface as exceptions

## Review Rules

- Do not combine command and query behavior in the same processor.
- Do not let queries append events.
- Do not model expected command conflicts as thrown exceptions.
- Do not hide technical failures inside `status: false`.
- Do not collapse many unrelated requests into one generic processor.

## Design Goal

A codebase should make its requests and processors easy to inspect:
- each request has a clear module
- each processor has a single responsibility
- the event store dependency is explicit
- the request/response contract is visible in types
