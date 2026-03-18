import {
  generateSchedule,
  type ExpoDayContext,
  type SchedulingContextModel,
} from "../generateSchedule";

describe("generateSchedule", () => {
  it("returns a schedule for a valid context model", () => {
    const result = generateSchedule(
      createContextModel({
        expoDays: [createExpoDay(["Saal A", "Saal B"], ["2026-06-05T09:00:00.000Z"])],
        presentations: ["presentation-1", "presentation-2"],
        presenterAssignments: [
          ["presentation-1", ["attendee-7"]],
          ["presentation-2", ["attendee-8"]],
        ],
        attendeePreferences: [
          ["attendee-1", ["presentation-2"]],
          ["attendee-2", ["presentation-1"]],
        ],
      }),
      () => 0,
    );

    expect(result.status).toBe(true);

    if (!result.status) {
      throw new Error("expected schedule generation to succeed");
    }

    expect(result.schedule.slots).toHaveLength(1);
    expect(result.schedule.slots[0]?.tracks).toHaveLength(2);
  });

  it("returns a reason when the expo is missing", () => {
    const result = generateSchedule(
      {
        expo: null,
        attendeeIds: ["attendee-1"],
        presentations: [{ presentationId: "presentation-1" }],
        presenterAssignments: new Map([["presentation-1", ["attendee-7"]]]),
        attendeePreferences: new Map(),
      },
      () => 0,
    );

    expect(result).toEqual({
      status: false,
      reason: "Es gibt keine Expo-Konfiguration fuer das Scheduling.",
    });
  });

  it("returns a reason when presentations cannot be separated across timeslots", () => {
    const result = generateSchedule(
      createContextModel({
        expoDays: [createExpoDay(["Saal A", "Saal B"], ["2026-06-05T09:00:00.000Z"])],
        presentations: ["presentation-1", "presentation-2"],
        presenterAssignments: [
          ["presentation-1", ["attendee-7"]],
          ["presentation-2", ["attendee-8"]],
        ],
        attendeePreferences: [["attendee-1", ["presentation-1", "presentation-2"]]],
      }),
      () => 0,
    );

    expect(result).toEqual({
      status: false,
      reason:
        "Die Praesentationen lassen sich nicht konfliktfrei auf die verfuegbaren Zeitslots verteilen.",
    });
  });

  it("returns a reason when attendee preferences remain unfulfilled", () => {
    const result = generateSchedule(
      createContextModel({
        expoDays: [createExpoDay(["Saal A"], ["2026-06-05T09:00:00.000Z"])],
        presentations: ["presentation-1"],
        presenterAssignments: [["presentation-1", ["attendee-7"]]],
        attendeePreferences: [["attendee-1", ["presentation-1", "presentation-2"]]],
      }),
      () => 0,
    );

    expect(result).toEqual({
      status: false,
      reason:
        "Die Teilnehmerpraeferenzen koennen mit dem erzeugten Presentation-Scheduling nicht vollstaendig erfuellt werden.",
    });
  });

  it("repeats a presentation in another timeslot with a different presenter", () => {
    const result = generateSchedule(
      createContextModel({
        expoDays: [
          createExpoDay(
            ["Saal A"],
            [
              "2026-06-05T09:00:00.000Z",
              "2026-06-05T10:15:00.000Z",
              "2026-06-05T11:30:00.000Z",
            ],
          ),
        ],
        presentations: ["presentation-1", "presentation-2"],
        presenterAssignments: [
          ["presentation-1", ["attendee-7", "attendee-9"]],
          ["presentation-2", ["attendee-8"]],
        ],
        attendeeIds: ["attendee-1", "attendee-2", "attendee-7", "attendee-8", "attendee-9"],
        attendeePreferences: [["attendee-1", ["presentation-1"]]],
      }),
      () => 0,
    );

    expect(result.status).toBe(true);

    if (!result.status) {
      throw new Error("expected schedule generation to succeed");
    }

    const repeatedTracks = result.schedule.slots.flatMap((slot) =>
      slot.tracks.filter((track) => track.presentation === "presentation-1"),
    );

    expect(repeatedTracks).toHaveLength(2);
    expect(new Set(repeatedTracks.map((track) => track.presenter))).toEqual(
      new Set(["attendee-7", "attendee-9"]),
    );
    expect(
      new Set(
        result.schedule.slots
          .filter((slot) =>
            slot.tracks.some((track) => track.presentation === "presentation-1"),
          )
          .map((slot) => slot.from.toISOString()),
      ).size,
    ).toBe(2);
  });
});

function createContextModel(options: {
  expoDays: ExpoDayContext[];
  presentations: string[];
  presenterAssignments: Array<[string, string[]]>;
  attendeePreferences: Array<[string, string[]]>;
  attendeeIds?: string[];
}): SchedulingContextModel {
  const attendeeIds =
    options.attendeeIds ??
    Array.from(
      new Set([
        "attendee-1",
        "attendee-2",
        ...options.presenterAssignments.flatMap(([, presenters]) => presenters),
        ...options.attendeePreferences.map(([attendeeId]) => attendeeId),
      ]),
    ).sort();

  return {
    expo: {
      days: options.expoDays,
    },
    attendeeIds,
    presentations: options.presentations.map((presentationId) => ({
      presentationId,
    })),
    presenterAssignments: new Map(options.presenterAssignments),
    attendeePreferences: new Map(options.attendeePreferences),
  };
}

function createExpoDay(
  rooms: string[],
  slotStartingTimes: string[],
): ExpoDayContext {
  return {
    date: new Date("2026-06-05T00:00:00.000Z"),
    rooms,
    slotLengthInMin: 60,
    slotStartingTimes: slotStartingTimes.map((value) => new Date(value)),
  };
}
