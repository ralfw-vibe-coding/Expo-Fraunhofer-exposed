import {
  createFilter,
  createQuery,
  type Event,
  type EventRecord,
  type EventStore,
  type QueryResult,
} from "@ricofritzsche/eventstore";

export type SubmitPreferencesCommand = {
  attendeeId: string;
  presentationIds: string[];
};

export type SubmitPreferencesCommandResponse = {
  status: boolean;
  message: string;
  preferencesSubmittedId?: string;
};

type SubmitPreferencesContextModel = {
  expo: ExpoCreatedPayload | null;
  attendeeRegistered: boolean;
  presentationIds: Set<string>;
};

type ExpoCreatedPayload = {
  prefSubmissionDeadline?: Date;
};

type AttendeeRegisteredPayload = {
  attendeeId: string;
};

type PresentationSubmittedPayload = {
  presentationId: string;
};

const EXPO_CREATED = "expoCreated";
const ATTENDEE_REGISTERED = "attendeeRegistered";
const PRESENTATION_SUBMITTED = "presentationSubmitted";
const PREFERENCES_SUBMITTED = "preferencesSubmitted";

export class SubmitPreferencesProcessor {
  constructor(
    private readonly eventStore: EventStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async process(
    request: SubmitPreferencesCommand,
  ): Promise<SubmitPreferencesCommandResponse> {
    const plausibilityFailure = this.checkPlausibility(request);
    if (plausibilityFailure) {
      return plausibilityFailure;
    }

    const contextQuery = this.buildContextQuery(request);
    const contextResult = await this.loadContext(contextQuery);
    const contextModel = this.buildContextModel(contextResult.events, request);

    const validationFailure = this.validate(request, contextModel);
    if (validationFailure) {
      return validationFailure;
    }

    const preferenceEvent = this.createEvent(request);

    try {
      await this.appendEvent(
        preferenceEvent,
        contextQuery,
        contextResult.maxSequenceNumber,
      );
    } catch (error) {
      if (this.isOptimisticLockConflict(error)) {
        return {
          status: false,
          message:
            "Preferences could not be submitted because the relevant context changed.",
        };
      }

      throw error;
    }

    return {
      status: true,
      message: "Preferences submitted successfully.",
      preferencesSubmittedId: preferenceEvent.payload.preferencesSubmittedId,
    };
  }

  private checkPlausibility(
    request: SubmitPreferencesCommand,
  ): SubmitPreferencesCommandResponse | null {
    if (!request.attendeeId.trim()) {
      return {
        status: false,
        message: "attendeeId is required.",
      };
    }

    if (request.presentationIds.length === 0) {
      return {
        status: false,
        message: "At least one presentationId is required.",
      };
    }

    const normalizedPresentationIds = request.presentationIds.map(
      (presentationId) => presentationId.trim(),
    );

    if (normalizedPresentationIds.some((presentationId) => !presentationId)) {
      return {
        status: false,
        message: "presentationIds must not contain empty values.",
      };
    }

    if (
      new Set(normalizedPresentationIds).size !==
      normalizedPresentationIds.length
    ) {
      return {
        status: false,
        message: "presentationIds must be unique.",
      };
    }

    return null;
  }

  private buildContextQuery(request: SubmitPreferencesCommand) {
    const expoFilter = createFilter([EXPO_CREATED]);
    const attendeeFilter = createFilter([ATTENDEE_REGISTERED]);
    const presentationFilter = createFilter([PRESENTATION_SUBMITTED]);

    return createQuery(expoFilter, attendeeFilter, presentationFilter);
  }

  private async loadContext(
    contextQuery: ReturnType<typeof createQuery>,
  ): Promise<QueryResult> {
    return this.eventStore.query(contextQuery);
  }

  private buildContextModel(
    events: EventRecord[],
    request: SubmitPreferencesCommand,
  ): SubmitPreferencesContextModel {
    let expo: ExpoCreatedPayload | null = null;
    let attendeeRegistered = false;
    const presentationIds = new Set<string>();

    for (const event of events) {
      if (event.eventType === EXPO_CREATED) {
        const payload = this.parseExpoCreatedPayload(event.payload);
        if (payload) {
          expo = payload;
        }
      }

      if (event.eventType === ATTENDEE_REGISTERED) {
        const payload = this.parseAttendeeRegisteredPayload(event.payload);
        if (payload?.attendeeId === request.attendeeId) {
          attendeeRegistered = true;
        }
      }

      if (event.eventType === PRESENTATION_SUBMITTED) {
        const payload = this.parsePresentationSubmittedPayload(event.payload);
        if (
          payload &&
          request.presentationIds.includes(payload.presentationId)
        ) {
          presentationIds.add(payload.presentationId);
        }
      }
    }

    return {
      expo,
      attendeeRegistered,
      presentationIds,
    };
  }

  private validate(
    request: SubmitPreferencesCommand,
    contextModel: SubmitPreferencesContextModel,
  ): SubmitPreferencesCommandResponse | null {
    if (!contextModel.expo) {
      return {
        status: false,
        message: "Preferences cannot be submitted because no expo exists yet.",
      };
    }

    if (
      contextModel.expo.prefSubmissionDeadline &&
      this.now().getTime() > contextModel.expo.prefSubmissionDeadline.getTime()
    ) {
      return {
        status: false,
        message:
          "Preferences cannot be submitted after the preference submission deadline.",
      };
    }

    if (!contextModel.attendeeRegistered) {
      return {
        status: false,
        message: "Preferences cannot be submitted for an unknown attendee.",
      };
    }

    const missingPresentationIds = request.presentationIds.filter(
      (presentationId) => !contextModel.presentationIds.has(presentationId),
    );

    if (missingPresentationIds.length > 0) {
      return {
        status: false,
        message: `Preferences cannot be submitted because presentations are missing: ${missingPresentationIds.join(
          ", ",
        )}.`,
      };
    }

    return null;
  }

  private createEvent(request: SubmitPreferencesCommand): Event & {
    payload: {
      preferencesSubmittedId: string;
      attendeeId: string;
      presentationIds: string[];
    };
  } {
    return {
      eventType: PREFERENCES_SUBMITTED,
      payload: {
        preferencesSubmittedId: crypto.randomUUID(),
        attendeeId: request.attendeeId,
        presentationIds: [...request.presentationIds],
      },
    };
  }

  private async appendEvent(
    event: Event,
    contextQuery: ReturnType<typeof createQuery>,
    expectedMaxSequenceNumber: number,
  ): Promise<void> {
    await this.eventStore.append(
      [event],
      contextQuery,
      expectedMaxSequenceNumber,
    );
  }

  private isOptimisticLockConflict(error: unknown): boolean {
    return error instanceof Error && error.message.includes("Context changed");
  }

  private parseExpoCreatedPayload(
    payload: Record<string, unknown>,
  ): ExpoCreatedPayload | null {
    const prefSubmissionDeadline = this.readDate(
      payload.prefSubmissionDeadline,
    );

    return {
      prefSubmissionDeadline: prefSubmissionDeadline ?? undefined,
    };
  }

  private parseAttendeeRegisteredPayload(
    payload: Record<string, unknown>,
  ): AttendeeRegisteredPayload | null {
    const attendeeId =
      this.readString(payload.attendeeId) ??
      this.readString(payload.attendeeRegisteredId);
    if (!attendeeId) {
      return null;
    }

    return { attendeeId };
  }

  private parsePresentationSubmittedPayload(
    payload: Record<string, unknown>,
  ): PresentationSubmittedPayload | null {
    const presentationId =
      this.readString(payload.presentationId) ??
      this.readString(payload.presentationSubmittedId);
    if (!presentationId) {
      return null;
    }

    return { presentationId };
  }

  private readString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
  }

  private readDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }
}
