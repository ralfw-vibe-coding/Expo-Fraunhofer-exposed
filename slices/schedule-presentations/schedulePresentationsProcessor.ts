import {
  createFilter,
  createQuery,
  type Event,
  type EventRecord,
  type EventStore,
} from "@ricofritzsche/eventstore";
import {
  generateSchedule,
  type ExpoContext,
  type ExpoDayContext,
  type PresentationContext,
  type ScheduleGenerationResult,
  type Schedule,
  type SchedulingContextModel,
  type Slot,
  type Track,
} from "./generateSchedule";

export const EXPO_CREATED_EVENT_TYPE = "expoCreated";
export const ATTENDEE_REGISTERED_EVENT_TYPE = "attendeeRegistered";
export const PRESENTATION_SUBMITTED_EVENT_TYPE = "presentationSubmitted";
export const PREFERENCES_SUBMITTED_EVENT_TYPE = "preferencesSubmitted";
export const PRESENTER_ASSIGNED_EVENT_TYPE = "presenterAssigned";
export const PRESENTATION_PREFERENCE_ASSIGNED_EVENT_TYPE =
  "presentationPreferenceAssigned";
export const PRESENTATIONS_SCHEDULED_EVENT_TYPE = "presentationsScheduled";

export type SchedulePresentationsCommand = Record<string, never>;

export type SchedulePresentationsCommandResponse =
  | {
      status: true;
      message: string;
      presentationsScheduledId: string;
      schedule: Schedule;
    }
  | {
      status: false;
      message: string;
    };

export class SchedulePresentationsProcessor {
  constructor(
    private readonly eventStore: EventStore,
    private readonly randomNumberGenerator: () => number = Math.random,
  ) {}

  async process(
    _request: SchedulePresentationsCommand = {},
  ): Promise<SchedulePresentationsCommandResponse> {
    const schedulingContext = createSchedulingContextQuery();
    const currentSchedulingState = await this.eventStore.query(schedulingContext);
    const contextModel = this.buildContextModel(currentSchedulingState.events);
    const contextValidationError = this.validateContext(contextModel);

    if (contextValidationError) {
      return {
        status: false,
        message: contextValidationError,
      };
    }

    const schedulingResult: ScheduleGenerationResult = generateSchedule(
      contextModel,
      this.randomNumberGenerator,
    );

    if (!schedulingResult.status) {
      return {
        status: false,
        message: schedulingResult.reason,
      };
    }

    const { schedule } = schedulingResult;
    const event = this.createPresentationsScheduledEvent(schedule);

    try {
      await this.eventStore.append(
        [event],
        schedulingContext,
        currentSchedulingState.maxSequenceNumber,
      );
    } catch (error) {
      if (this.isOptimisticLockConflict(error)) {
        return {
          status: false,
          message:
            "Der Schedule konnte nicht gespeichert werden, weil zwischenzeitlich eine andere Planung geschrieben wurde.",
        };
      }

      throw error;
    }

    return {
      status: true,
      message: "Der Schedule wurde generiert und gespeichert.",
      presentationsScheduledId: event.payload.presentationsScheduledId,
      schedule,
    };
  }

  private buildContextModel(events: EventRecord[]): SchedulingContextModel {
    const expoCreated = events.find(
      (event) => event.eventType === EXPO_CREATED_EVENT_TYPE,
    );
    const attendeeIds = Array.from(
      new Set(
        events
          .filter((event) => event.eventType === ATTENDEE_REGISTERED_EVENT_TYPE)
          .flatMap((event) => this.readIdField(event.payload, "attendeeRegisteredId")),
      ),
    ).sort();
    const presentations = events
      .filter((event) => event.eventType === PRESENTATION_SUBMITTED_EVENT_TYPE)
      .flatMap((event) => {
        const presentationId = this.readIdField(
          event.payload,
          "presentationSubmittedId",
        );

        if (!presentationId) {
          return [];
        }

        return [{ presentationId }];
      })
      .sort((left, right) =>
        left.presentationId.localeCompare(right.presentationId),
      );
    const presenterAssignments = this.buildPresenterAssignments(events);
    const attendeePreferences = this.buildAttendeePreferences(events);

    return {
      expo: expoCreated ? this.parseExpoCreatedEvent(expoCreated) : null,
      attendeeIds,
      presentations,
      presenterAssignments,
      attendeePreferences,
    };
  }

  private buildPresenterAssignments(
    events: EventRecord[],
  ): Map<string, string[]> {
    const assignments = new Map<string, Set<string>>();

    for (const event of events) {
      if (event.eventType !== PRESENTER_ASSIGNED_EVENT_TYPE) {
        continue;
      }

      const attendeeId = this.readScopeId(event.payload, "attendeeRegisteredId");
      const presentationId = this.readScopeId(
        event.payload,
        "presentationSubmittedId",
      );

      if (!attendeeId || !presentationId) {
        continue;
      }

      const presenters = assignments.get(presentationId) ?? new Set<string>();
      presenters.add(attendeeId);
      assignments.set(presentationId, presenters);
    }

    return new Map(
      Array.from(assignments.entries()).map(([presentationId, presenters]) => [
        presentationId,
        Array.from(presenters).sort(),
      ]),
    );
  }

  private buildAttendeePreferences(
    events: EventRecord[],
  ): Map<string, string[]> {
    const preferenceSubmissions = new Map<string, string>();

    for (const event of events) {
      if (event.eventType !== PREFERENCES_SUBMITTED_EVENT_TYPE) {
        continue;
      }

      const submissionId =
        this.readIdField(event.payload, "preferencesSubmittedId") ??
        this.readIdField(event.payload, "preferenceSubmittedId");
      const attendeeId = this.readScopeId(event.payload, "attendeeRegisteredId");

      if (!submissionId || !attendeeId) {
        continue;
      }

      preferenceSubmissions.set(submissionId, attendeeId);
    }

    const preferencesByAttendee = new Map<string, Map<string, number>>();

    for (const event of events) {
      if (event.eventType !== PRESENTATION_PREFERENCE_ASSIGNED_EVENT_TYPE) {
        continue;
      }

      const submissionId =
        this.readScopeId(event.payload, "preferencesSubmittedId") ??
        this.readScopeId(event.payload, "preferenceSubmittedId");
      const attendeeId =
        this.readScopeId(event.payload, "attendeeRegisteredId") ??
        (submissionId ? preferenceSubmissions.get(submissionId) : null);
      const presentationId =
        this.readScopeId(event.payload, "presentationSubmittedId") ??
        this.readIdField(event.payload, "presentationSubmittedId") ??
        this.readIdField(event.payload, "presentation");
      const rank =
        typeof event.payload.rank === "number"
          ? event.payload.rank
          : Number.MAX_SAFE_INTEGER;

      if (!attendeeId || !presentationId) {
        continue;
      }

      const attendeePreferences =
        preferencesByAttendee.get(attendeeId) ?? new Map<string, number>();
      const knownRank = attendeePreferences.get(presentationId);

      if (knownRank === undefined || rank < knownRank) {
        attendeePreferences.set(presentationId, rank);
      }

      preferencesByAttendee.set(attendeeId, attendeePreferences);
    }

    return new Map(
      Array.from(preferencesByAttendee.entries()).map(
        ([attendeeId, preferences]) => [
          attendeeId,
          Array.from(preferences.entries())
            .sort((left, right) => {
              if (left[1] !== right[1]) {
                return left[1] - right[1];
              }

              return left[0].localeCompare(right[0]);
            })
            .map(([presentationId]) => presentationId),
        ],
      ),
    );
  }

  private validateContext(contextModel: SchedulingContextModel): string | null {
    if (!contextModel.expo) {
      return "Scheduling ist erst moeglich, nachdem eine Expo angelegt wurde.";
    }

    if (contextModel.presentations.length === 0) {
      return "Scheduling ist erst moeglich, nachdem Praesentationen eingereicht wurden.";
    }

    const atomicSlots = countAtomicSlots(contextModel.expo.days);

    if (atomicSlots < contextModel.presentations.length) {
      return "Es gibt nicht genug Slots, um jede Presentation mindestens einmal einzuplanen.";
    }

    for (const presentation of contextModel.presentations) {
      const presenters =
        contextModel.presenterAssignments.get(presentation.presentationId) ?? [];

      if (presenters.length === 0) {
        return `Fuer die Presentation "${presentation.presentationId}" gibt es keinen zugewiesenen Referenten.`;
      }
    }

    for (const [attendeeId, preferences] of contextModel.attendeePreferences) {
      for (const presentationId of preferences) {
        const exists = contextModel.presentations.some(
          (presentation) => presentation.presentationId === presentationId,
        );

        if (!exists) {
          return `Die Praeferenz von "${attendeeId}" verweist auf die unbekannte Presentation "${presentationId}".`;
        }
      }
    }

    return null;
  }

  private createPresentationsScheduledEvent(schedule: Schedule): Event & {
    payload: {
      presentationsScheduledId: string;
      schedule: Schedule;
    };
  } {
    return {
      eventType: PRESENTATIONS_SCHEDULED_EVENT_TYPE,
      payload: {
        presentationsScheduledId: crypto.randomUUID(),
        schedule,
      },
    };
  }

  private parseExpoCreatedEvent(event: EventRecord): ExpoContext | null {
    const daysValue = event.payload.days;

    if (!Array.isArray(daysValue)) {
      return null;
    }

    const days = daysValue
      .map((day) => this.parseExpoDay(day))
      .filter((day): day is ExpoDayContext => day !== null);

    if (days.length === 0) {
      return null;
    }

    return { days };
  }

  private parseExpoDay(day: unknown): ExpoDayContext | null {
    if (!this.isRecord(day)) {
      return null;
    }

    const date = this.readDate(day.date);
    const rooms = Array.isArray(day.rooms)
      ? day.rooms.filter((room): room is string => typeof room === "string")
      : [];
    const slotLengthInMin =
      typeof day.slotLengthInMin === "number"
        ? day.slotLengthInMin
        : typeof day.slotLengthMin === "number"
          ? day.slotLengthMin
          : null;
    const slotStartingTimes = Array.isArray(day.slotStartingTimes)
      ? day.slotStartingTimes
          .map((value) => this.readDate(value))
          .filter((value): value is Date => value !== null)
      : [];

    if (!date || slotLengthInMin === null || rooms.length === 0) {
      return null;
    }

    return {
      date,
      rooms: Array.from(new Set(rooms)).sort(),
      slotLengthInMin,
      slotStartingTimes,
    };
  }

  private readDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return null;
  }

  private readIdField(
    payload: Record<string, unknown>,
    fieldName: string,
  ): string | null {
    const value = payload[fieldName];
    return typeof value === "string" && value.trim() ? value : null;
  }

  private readScopeId(
    payload: Record<string, unknown>,
    scopeName: string,
  ): string | null {
    if (!this.isRecord(payload.scopes)) {
      return null;
    }

    const value = payload.scopes[scopeName];
    return typeof value === "string" && value.trim() ? value : null;
  }

  private isOptimisticLockConflict(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.includes(
        "Context changed: events were modified between query() and append()",
      )
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}

function countAtomicSlots(expoDays: ExpoDayContext[]): number {
  return expoDays.reduce(
    (count, expoDay) =>
      count + expoDay.rooms.length * expoDay.slotStartingTimes.length,
    0,
  );
}

function createSchedulingContextQuery() {
  return createQuery(
    createFilter([
      EXPO_CREATED_EVENT_TYPE,
      ATTENDEE_REGISTERED_EVENT_TYPE,
      PRESENTATION_SUBMITTED_EVENT_TYPE,
      PREFERENCES_SUBMITTED_EVENT_TYPE,
      PRESENTER_ASSIGNED_EVENT_TYPE,
      PRESENTATION_PREFERENCE_ASSIGNED_EVENT_TYPE,
      PRESENTATIONS_SCHEDULED_EVENT_TYPE,
    ]),
  );
}
