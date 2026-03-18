import type { Event, EventStore } from "@ricofritzsche/eventstore";

export const EXPO_CREATED_EVENT_TYPE = "expoCreated";

export type Day = {
  date: Date | string;
  numberTracks: number;
  slotLengthMin: number;
  slotStartingTimes: Array<Date | string>;
};

export type CreateExpoCommand = {
  expoCreatedId: string;
  days: Day[];
  presentationSubmissionDeadline: Date | string;
  prefSubmissionDeadline: Date | string;
};

export type CreateExpoCommandResponse = {
  status: boolean;
  message: string;
};

export class CreateExpoProcessor {
  constructor(private readonly eventStore: EventStore) {}

  async process(request: CreateExpoCommand): Promise<CreateExpoCommandResponse> {
    const plausibilityFailure = this.checkPlausibility(request);
    if (plausibilityFailure) {
      return plausibilityFailure;
    }

    const events = this.createEvents(request);
    return this.appendEvents(events);
  }

  private checkPlausibility(request: CreateExpoCommand): CreateExpoCommandResponse | null {
    if (!request.expoCreatedId.trim()) {
      return { status: false, message: "expoCreatedId is required." };
    }

    if (request.days.length === 0) {
      return { status: false, message: "At least one expo day is required." };
    }

    const presentationSubmissionDeadline = this.parseDate(
      request.presentationSubmissionDeadline,
      "presentationSubmissionDeadline",
    );

    if (!presentationSubmissionDeadline.ok) {
      return presentationSubmissionDeadline.failure;
    }

    const prefSubmissionDeadline = this.parseDate(request.prefSubmissionDeadline, "prefSubmissionDeadline");

    if (!prefSubmissionDeadline.ok) {
      return prefSubmissionDeadline.failure;
    }

    if (presentationSubmissionDeadline.value > prefSubmissionDeadline.value) {
      return {
        status: false,
        message: "presentationSubmissionDeadline must be earlier than or equal to prefSubmissionDeadline.",
      };
    }

    for (const [index, day] of request.days.entries()) {
      if (!this.isValidDateValue(day.date)) {
        return { status: false, message: `days[${index}].date must be a valid date value.` };
      }

      if (!Number.isInteger(day.numberTracks) || day.numberTracks <= 0) {
        return { status: false, message: `days[${index}].numberTracks must be a positive integer.` };
      }

      if (!Number.isInteger(day.slotLengthMin) || day.slotLengthMin <= 0) {
        return { status: false, message: `days[${index}].slotLengthMin must be a positive integer.` };
      }

      if (day.slotStartingTimes.length === 0) {
        return { status: false, message: `days[${index}].slotStartingTimes must contain at least one entry.` };
      }

      for (const [slotIndex, slotStartingTime] of day.slotStartingTimes.entries()) {
        if (!this.isValidDateValue(slotStartingTime)) {
          return {
            status: false,
            message: `days[${index}].slotStartingTimes[${slotIndex}] must be a valid date value.`,
          };
        }
      }
    }

    return null;
  }

  private createEvents(request: CreateExpoCommand): Event[] {
    return [
      {
        eventType: EXPO_CREATED_EVENT_TYPE,
        payload: {
          expoCreatedId: request.expoCreatedId,
          days: request.days.map((day) => ({
            date: this.toIsoString(day.date),
            numberTracks: day.numberTracks,
            slotLengthMin: day.slotLengthMin,
            slotStartingTimes: day.slotStartingTimes.map((slotStartingTime) => this.toIsoString(slotStartingTime)),
          })),
          presentationSubmissionDeadline: this.toIsoString(request.presentationSubmissionDeadline),
          prefSubmissionDeadline: this.toIsoString(request.prefSubmissionDeadline),
        },
      },
    ];
  }

  private async appendEvents(events: Event[]): Promise<CreateExpoCommandResponse> {
    await this.eventStore.append(events);

    return {
      status: true,
      message: "Expo was created.",
    };
  }

  private parseDate(
    value: Date | string,
    fieldName: string,
  ):
    | { ok: true; value: Date }
    | { ok: false; failure: CreateExpoCommandResponse } {
    const parsedValue = new Date(value);

    if (Number.isNaN(parsedValue.getTime())) {
      return {
        ok: false,
        failure: {
          status: false,
          message: `${fieldName} must be a valid date value.`,
        },
      };
    }

    return { ok: true, value: parsedValue };
  }

  private isValidDateValue(value: Date | string): boolean {
    return !Number.isNaN(new Date(value).getTime());
  }

  private toIsoString(value: Date | string): string {
    return new Date(value).toISOString();
  }
}
