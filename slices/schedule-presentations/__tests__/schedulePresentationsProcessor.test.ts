import { MemoryEventStore } from "@ricofritzsche/eventstore";
import {
  ATTENDEE_REGISTERED_EVENT_TYPE,
  EXPO_CREATED_EVENT_TYPE,
  PREFERENCES_SUBMITTED_EVENT_TYPE,
  PRESENTER_ASSIGNED_EVENT_TYPE,
  PRESENTATION_PREFERENCE_ASSIGNED_EVENT_TYPE,
  PRESENTATION_SUBMITTED_EVENT_TYPE,
  PRESENTATIONS_SCHEDULED_EVENT_TYPE,
  SchedulePresentationsProcessor,
} from "../schedulePresentationsProcessor";

describe("SchedulePresentationsProcessor", () => {
  it("generates a schedule and assigns attendees to their preferred presentations first", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new SchedulePresentationsProcessor(eventStore, () => 0);

    await seedSchedulingContext(eventStore, {
      expoDays: [
        {
          date: "2026-06-05T00:00:00.000Z",
          rooms: ["Saal A", "Saal B"],
          slotLengthInMin: 60,
          slotStartingTimes: ["2026-06-05T09:00:00.000Z"],
        },
      ],
      presentations: [
        { id: "presentation-1", title: "Domain Events" },
        { id: "presentation-2", title: "Projection Design" },
      ],
      presenterAssignments: [
        { attendeeId: "attendee-7", presentationId: "presentation-1" },
        { attendeeId: "attendee-8", presentationId: "presentation-2" },
      ],
      preferenceAssignments: [
        {
          attendeeId: "attendee-1",
          preferencesSubmittedId: "prefs-1",
          presentationId: "presentation-2",
          rank: 1,
        },
        {
          attendeeId: "attendee-2",
          preferencesSubmittedId: "prefs-2",
          presentationId: "presentation-1",
          rank: 1,
        },
      ],
    });

    const response = await processor.process();
    const storedEvents = await eventStore.query({
      filters: [{ eventTypes: [PRESENTATIONS_SCHEDULED_EVENT_TYPE] }],
    });

    expect(response.status).toBe(true);
    expect(storedEvents.events).toHaveLength(1);

    if (!response.status) {
      throw new Error("expected a generated schedule");
    }

    expect(response.schedule.slots).toHaveLength(1);
    expect(response.schedule.slots[0]?.tracks).toHaveLength(2);

    const trackByPresentation = new Map(
      response.schedule.slots[0]?.tracks.map((track) => [track.presentation, track]),
    );

    expect(trackByPresentation.get("presentation-2")?.attendees).toContain(
      "attendee-1",
    );
    expect(trackByPresentation.get("presentation-1")?.attendees).toContain(
      "attendee-2",
    );
    expect(trackByPresentation.get("presentation-1")?.attendees).not.toContain(
      "attendee-7",
    );
    expect(trackByPresentation.get("presentation-2")?.attendees).not.toContain(
      "attendee-8",
    );
  });

  it("fails when attendee preferences cannot be satisfied with the available timeslots", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new SchedulePresentationsProcessor(eventStore, () => 0);

    await seedSchedulingContext(eventStore, {
      expoDays: [
        {
          date: "2026-06-05T00:00:00.000Z",
          rooms: ["Saal A", "Saal B"],
          slotLengthInMin: 60,
          slotStartingTimes: ["2026-06-05T09:00:00.000Z"],
        },
      ],
      presentations: [
        { id: "presentation-1", title: "Domain Events" },
        { id: "presentation-2", title: "Projection Design" },
      ],
      presenterAssignments: [
        { attendeeId: "attendee-7", presentationId: "presentation-1" },
        { attendeeId: "attendee-8", presentationId: "presentation-2" },
      ],
      preferenceAssignments: [
        {
          attendeeId: "attendee-1",
          preferencesSubmittedId: "prefs-1",
          presentationId: "presentation-1",
          rank: 1,
        },
        {
          attendeeId: "attendee-1",
          preferencesSubmittedId: "prefs-1",
          presentationId: "presentation-2",
          rank: 2,
        },
      ],
    });

    const response = await processor.process();
    const storedEvents = await eventStore.query({
      filters: [{ eventTypes: [PRESENTATIONS_SCHEDULED_EVENT_TYPE] }],
    });

    expect(response).toEqual({
      status: false,
      message:
        "Die Praesentationen lassen sich nicht konfliktfrei auf die verfuegbaren Zeitslots verteilen.",
    });
    expect(storedEvents.events).toHaveLength(0);
  });

  it("repeats a presentation in another timeslot with a different presenter when spare timeslots exist", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new SchedulePresentationsProcessor(eventStore, () => 0);

    await seedSchedulingContext(eventStore, {
      expoDays: [
        {
          date: "2026-06-05T00:00:00.000Z",
          rooms: ["Saal A"],
          slotLengthInMin: 60,
          slotStartingTimes: [
            "2026-06-05T09:00:00.000Z",
            "2026-06-05T10:15:00.000Z",
            "2026-06-05T11:30:00.000Z",
          ],
        },
      ],
      presentations: [
        { id: "presentation-1", title: "Domain Events" },
        { id: "presentation-2", title: "Projection Design" },
      ],
      presenterAssignments: [
        { attendeeId: "attendee-7", presentationId: "presentation-1" },
        { attendeeId: "attendee-9", presentationId: "presentation-1" },
        { attendeeId: "attendee-8", presentationId: "presentation-2" },
      ],
      preferenceAssignments: [
        {
          attendeeId: "attendee-1",
          preferencesSubmittedId: "prefs-1",
          presentationId: "presentation-1",
          rank: 1,
        },
      ],
      additionalAttendees: ["attendee-9"],
    });

    const response = await processor.process();

    expect(response.status).toBe(true);

    if (!response.status) {
      throw new Error("expected a generated schedule");
    }

    const occurrencesOfPresentationOne = response.schedule.slots.flatMap((slot) =>
      slot.tracks.filter((track) => track.presentation === "presentation-1"),
    );

    expect(occurrencesOfPresentationOne).toHaveLength(2);
    expect(
      new Set(occurrencesOfPresentationOne.map((track) => track.presenter)),
    ).toEqual(new Set(["attendee-7", "attendee-9"]));
    expect(
      new Set(
        response.schedule.slots
          .filter((slot) =>
            slot.tracks.some((track) => track.presentation === "presentation-1"),
          )
          .map((slot) => slot.from.toISOString()),
      ).size,
    ).toBe(2);
  });

  it("fails when there are not enough atomic slots for all presentations", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new SchedulePresentationsProcessor(eventStore, () => 0);

    await seedSchedulingContext(eventStore, {
      expoDays: [
        {
          date: "2026-06-05T00:00:00.000Z",
          rooms: ["Saal A"],
          slotLengthInMin: 60,
          slotStartingTimes: ["2026-06-05T09:00:00.000Z"],
        },
      ],
      presentations: [
        { id: "presentation-1", title: "Domain Events" },
        { id: "presentation-2", title: "Projection Design" },
      ],
      presenterAssignments: [
        { attendeeId: "attendee-7", presentationId: "presentation-1" },
        { attendeeId: "attendee-8", presentationId: "presentation-2" },
      ],
      preferenceAssignments: [],
    });

    const response = await processor.process();

    expect(response).toEqual({
      status: false,
      message:
        "Es gibt nicht genug Slots, um jede Presentation mindestens einmal einzuplanen.",
    });
  });

  it("accepts expo days that only provide numberTracks like the create-expo slice", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new SchedulePresentationsProcessor(eventStore, () => 0);

    await eventStore.append([
      {
        eventType: EXPO_CREATED_EVENT_TYPE,
        payload: {
          expoCreatedId: "expo-created-1",
          days: [
            {
              date: "2026-06-05T00:00:00.000Z",
              numberTracks: 2,
              slotLengthMin: 60,
              slotStartingTimes: ["2026-06-05T09:00:00.000Z"],
            },
          ],
          presentationSubmissionDeadline: "2026-06-01T12:00:00.000Z",
          prefSubmissionDeadline: "2026-06-02T12:00:00.000Z",
        },
      },
      {
        eventType: ATTENDEE_REGISTERED_EVENT_TYPE,
        payload: {
          attendeeRegisteredId: "attendee-1",
          attendeeId: "attendee-1",
          name: "Ada",
          email: "ada@example.com",
        },
      },
      {
        eventType: ATTENDEE_REGISTERED_EVENT_TYPE,
        payload: {
          attendeeRegisteredId: "attendee-2",
          attendeeId: "attendee-2",
          name: "Grace",
          email: "grace@example.com",
        },
      },
      {
        eventType: PRESENTATION_SUBMITTED_EVENT_TYPE,
        payload: {
          presentationSubmittedId: "presentation-1",
          title: "Domain Events",
        },
      },
      {
        eventType: PRESENTER_ASSIGNED_EVENT_TYPE,
        payload: {
          presenterAssignedId: "presenter-assigned-1",
          scopes: {
            attendeeRegisteredId: "attendee-1",
            presentationSubmittedId: "presentation-1",
          },
        },
      },
    ]);

    const response = await processor.process();

    expect(response.status).toBe(true);

    if (!response.status) {
      throw new Error("expected a generated schedule");
    }

    expect(response.schedule.slots).toHaveLength(1);
    expect(response.schedule.slots[0]?.tracks[0]?.roomName).toBe("Track 1");
  });
});

type ExpoDaySeed = {
  date: string;
  rooms: string[];
  slotLengthInMin: number;
  slotStartingTimes: string[];
};

type PresentationSeed = {
  id: string;
  title: string;
};

type PresenterAssignmentSeed = {
  attendeeId: string;
  presentationId: string;
};

type PreferenceAssignmentSeed = {
  attendeeId: string;
  preferencesSubmittedId: string;
  presentationId: string;
  rank: number;
};

async function seedSchedulingContext(
  eventStore: MemoryEventStore,
  options: {
    expoDays: ExpoDaySeed[];
    presentations: PresentationSeed[];
    presenterAssignments: PresenterAssignmentSeed[];
    preferenceAssignments: PreferenceAssignmentSeed[];
    additionalAttendees?: string[];
  },
) {
  const registeredAttendees = new Set([
    "attendee-1",
    "attendee-2",
    "attendee-3",
    "attendee-4",
    "attendee-5",
    "attendee-7",
    "attendee-8",
    ...(options.additionalAttendees ?? []),
    ...options.presenterAssignments.map((assignment) => assignment.attendeeId),
    ...options.preferenceAssignments.map((assignment) => assignment.attendeeId),
  ]);
  const preferenceSubmissionIds = new Map<string, string>();

  for (const assignment of options.preferenceAssignments) {
    preferenceSubmissionIds.set(
      assignment.attendeeId,
      assignment.preferencesSubmittedId,
    );
  }

  await eventStore.append([
    {
      eventType: EXPO_CREATED_EVENT_TYPE,
      payload: {
        expoCreatedId: "expo-1",
        presentationSubmissionDeadline: "2026-05-01T18:00:00.000Z",
        prefSubmissionDeadline: "2026-05-12T18:00:00.000Z",
        days: options.expoDays,
      },
    },
    ...Array.from(registeredAttendees)
      .sort()
      .map((attendeeId) => ({
        eventType: ATTENDEE_REGISTERED_EVENT_TYPE,
        payload: {
          attendeeRegisteredId: attendeeId,
          name: attendeeId,
          email: `${attendeeId}@example.com`,
        },
      })),
    ...options.presentations.map((presentation) => ({
      eventType: PRESENTATION_SUBMITTED_EVENT_TYPE,
      payload: {
        presentationSubmittedId: presentation.id,
        title: presentation.title,
        abstract: `${presentation.title} abstract`,
        coverImage: `${presentation.id}.png`,
      },
    })),
    ...Array.from(preferenceSubmissionIds.entries()).map(
      ([attendeeId, preferencesSubmittedId]) => ({
        eventType: PREFERENCES_SUBMITTED_EVENT_TYPE,
        payload: {
          preferencesSubmittedId,
          scopes: {
            attendeeRegisteredId: attendeeId,
          },
        },
      }),
    ),
    ...options.presenterAssignments.map((assignment, index) => ({
      eventType: PRESENTER_ASSIGNED_EVENT_TYPE,
      payload: {
        presenterAssignedId: `presenter-assigned-${index + 1}`,
        scopes: {
          attendeeRegisteredId: assignment.attendeeId,
          presentationSubmittedId: assignment.presentationId,
        },
      },
    })),
    ...options.preferenceAssignments.map((assignment, index) => ({
      eventType: PRESENTATION_PREFERENCE_ASSIGNED_EVENT_TYPE,
      payload: {
        presentationPreferenceAssignedId: `presentation-preference-assigned-${index + 1}`,
        rank: assignment.rank,
        scopes: {
          attendeeRegisteredId: assignment.attendeeId,
          preferencesSubmittedId: assignment.preferencesSubmittedId,
          presentationSubmittedId: assignment.presentationId,
        },
      },
    })),
  ]);
}
