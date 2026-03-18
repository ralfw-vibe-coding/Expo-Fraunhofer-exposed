import {
  createFilter,
  createQuery,
  type Event,
  type EventRecord,
  type EventStore,
  type QueryResult,
} from "@ricofritzsche/eventstore";

export const ATTENDEE_REGISTERED_EVENT_TYPE = "attendeeRegistered";

export type AttendeeRegistrationInput = {
  name: string;
  email: string;
};

export type RegisterAttendeesCommand = {
  attendees: AttendeeRegistrationInput[];
};

export type RegisterAttendeesCommandResponse = {
  status: boolean;
  message: string;
  registeredCount: number;
  attendeeRegisteredIds: string[];
};

type RegisteredAttendeesContext = {
  registeredEmails: Set<string>;
};

export class RegisterAttendeesCommandProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(
    request: RegisterAttendeesCommand,
  ): Promise<RegisterAttendeesCommandResponse> {
    const plausibilityFailure = this.checkPlausibility(request);

    if (plausibilityFailure) {
      return plausibilityFailure;
    }

    const context = await this.loadContext();
    const contextModel = this.buildContextModel(context.events);
    const validationFailure = this.validate(request, contextModel);

    if (validationFailure) {
      return validationFailure;
    }

    const events = this.createEvents(request);
    await this.eventStore.append(events);

    return {
      status: true,
      message: `Registered ${events.length} attendees.`,
      registeredCount: events.length,
      attendeeRegisteredIds: events.map((event) => {
        const payload = event.payload as { attendeeRegisteredId: string };
        return payload.attendeeRegisteredId;
      }),
    };
  }

  private checkPlausibility(
    request: RegisterAttendeesCommand,
  ): RegisterAttendeesCommandResponse | null {
    if (!Array.isArray(request.attendees) || request.attendees.length === 0) {
      return {
        status: false,
        message: "Provide at least one attendee to register.",
        registeredCount: 0,
        attendeeRegisteredIds: [],
      };
    }

    for (const attendee of request.attendees) {
      if (typeof attendee.name !== "string" || attendee.name.trim().length === 0) {
        return {
          status: false,
          message: "Each attendee needs a non-empty name.",
          registeredCount: 0,
          attendeeRegisteredIds: [],
        };
      }

      if (
        typeof attendee.email !== "string" ||
        attendee.email.trim().length === 0 ||
        !attendee.email.includes("@")
      ) {
        return {
          status: false,
          message: "Each attendee needs a valid email address.",
          registeredCount: 0,
          attendeeRegisteredIds: [],
        };
      }
    }

    return null;
  }

  private async loadContext(): Promise<QueryResult> {
    const query = createQuery(createFilter([ATTENDEE_REGISTERED_EVENT_TYPE]));
    return this.eventStore.query(query);
  }

  private buildContextModel(events: EventRecord[]): RegisteredAttendeesContext {
    const registeredEmails = new Set<string>();

    for (const event of events) {
      if (event.eventType !== ATTENDEE_REGISTERED_EVENT_TYPE) {
        continue;
      }

      const payload = event.payload as { email?: unknown };

      if (typeof payload.email === "string") {
        registeredEmails.add(normalizeEmail(payload.email));
      }
    }

    return { registeredEmails };
  }

  private validate(
    request: RegisterAttendeesCommand,
    contextModel: RegisteredAttendeesContext,
  ): RegisterAttendeesCommandResponse | null {
    const emailsInRequest = new Set<string>();

    for (const attendee of request.attendees) {
      const normalizedEmail = normalizeEmail(attendee.email);

      if (emailsInRequest.has(normalizedEmail)) {
        return {
          status: false,
          message: `The email "${attendee.email}" appears more than once in the request.`,
          registeredCount: 0,
          attendeeRegisteredIds: [],
        };
      }

      if (contextModel.registeredEmails.has(normalizedEmail)) {
        return {
          status: false,
          message: `The email "${attendee.email}" is already registered.`,
          registeredCount: 0,
          attendeeRegisteredIds: [],
        };
      }

      emailsInRequest.add(normalizedEmail);
    }

    return null;
  }

  private createEvents(request: RegisterAttendeesCommand): Event[] {
    return request.attendees.map((attendee) => ({
      eventType: ATTENDEE_REGISTERED_EVENT_TYPE,
      payload: {
        attendeeRegisteredId: crypto.randomUUID(),
        name: attendee.name.trim(),
        email: normalizeEmail(attendee.email),
      },
    }));
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
