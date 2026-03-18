import { MemoryEventStore, type Event } from "@ricofritzsche/eventstore";
import { describe, expect, it } from "vitest";
import {
  GetMyTimelineQueryProcessor,
  type GetMyTimelineQueryResponse,
} from "../getMyTimelineProcessor";

const attendeeId = "attendee-1";

describe("GetMyTimelineQueryProcessor", () => {
  it("returns an empty successful result when no timeline events exist", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new GetMyTimelineQueryProcessor(eventStore);

    const response = await processor.process({ attendeeId });

    expect(response).toEqual<GetMyTimelineQueryResponse>({
      attendeeId,
      sessions: [],
    });
  });

  it("rejects a query without attendeeId", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new GetMyTimelineQueryProcessor(eventStore);

    await expect(processor.process({ attendeeId: "" })).rejects.toThrow("attendeeId is required");
  });

  it("returns only sessions relevant for attendeeId", async () => {
    const eventStore = new MemoryEventStore();
    const events = createBaselineEvents({
      scheduleTracks: [
        {
          roomName: "Raum A",
          presentation: "pres-1",
          presenter: attendeeId,
          attendees: ["attendee-2"],
        },
        {
          roomName: "Raum B",
          presentation: "pres-2",
          presenter: "attendee-2",
          attendees: [attendeeId],
        },
        {
          roomName: "Raum C",
          presentation: "pres-3",
          presenter: "attendee-3",
          attendees: ["attendee-4"],
        },
      ],
    });

    await eventStore.append(events);

    const processor = new GetMyTimelineQueryProcessor(eventStore);
    const response = await processor.process({ attendeeId });

    expect(response.sessions).toHaveLength(2);
    expect(response.sessions[0]).toMatchObject({
      presentationId: "pres-1",
      roomName: "Raum A",
      presenterId: attendeeId,
      presenterName: "David",
      startTime: "2026-03-18T10:00:00.000Z",
      endTime: "2026-03-18T11:00:00.000Z",
    });
    expect(response.sessions[1]).toMatchObject({
      presentationId: "pres-2",
      roomName: "Raum B",
      presenterId: "attendee-2",
      presenterName: "Eva",
      startTime: "2026-03-18T11:00:00.000Z",
      endTime: "2026-03-18T12:00:00.000Z",
    });
  });

  it("returns sessions sorted by start time", async () => {
    const eventStore = new MemoryEventStore();
    const events = createBaselineEvents({
      scheduleTracks: [
        {
          roomName: "Raum A",
          presentation: "pres-2",
          presenter: "attendee-2",
          attendees: [attendeeId],
        },
        {
          roomName: "Raum B",
          presentation: "pres-1",
          presenter: attendeeId,
          attendees: ["attendee-2"],
        },
      ],
    });

    await eventStore.append(events);

    const processor = new GetMyTimelineQueryProcessor(eventStore);
    const response = await processor.process({ attendeeId });

    expect(response.sessions.map((session) => session.startTime)).toEqual([
      "2026-03-18T10:00:00.000Z",
      "2026-03-18T11:00:00.000Z",
    ]);
  });

  it("falls back to schedule.from and slotLengthMin when slotStartingTimes are missing", async () => {
    const eventStore = new MemoryEventStore();

    await eventStore.append(createFallbackTimingEvents());

    const processor = new GetMyTimelineQueryProcessor(eventStore);
    const response = await processor.process({ attendeeId });

    expect(response.sessions).toHaveLength(1);
    expect(response.sessions[0]).toMatchObject({
      presentationId: "pres-1",
      startTime: "2026-03-18T10:00:00.000Z",
      endTime: "2026-03-18T11:00:00.000Z",
    });
  });

  it("stays robust when presentation metadata is missing", async () => {
    const eventStore = new MemoryEventStore();

    await eventStore.append([
      {
        eventType: "expoCreated",
        payload: {
          expoCreatedId: "expo-1",
          slotLengthMin: 60,
          slotStartingTimes: [new Date("2026-03-18T10:00:00.000Z")],
          days: [],
          rooms: ["Raum A"],
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: attendeeId,
          attendeeId,
          name: "David",
          email: "david@example.com",
        },
      },
      {
        eventType: "presentationsScheduled",
        payload: {
          presentationsScheduledId: "schedule-1",
          schedule: {
            from: new Date("2026-03-18T10:00:00.000Z"),
            until: new Date("2026-03-18T11:00:00.000Z"),
            slots: [{}],
            tracks: [
              {
                roomName: "Raum A",
                presentation: "unknown-presentation",
                presenter: attendeeId,
                attendees: ["attendee-2"],
              },
            ],
          },
        },
      },
    ]);

    const processor = new GetMyTimelineQueryProcessor(eventStore);
    const response = await processor.process({ attendeeId });

    expect(response.sessions).toHaveLength(1);
    expect(response.sessions[0]).toMatchObject({
      presentationId: "unknown-presentation",
      title: "unknown-presentation",
      presenterName: "David",
    });
  });
});

type BaselineInput = {
  scheduleTracks: Array<{
    roomName: string;
    presentation: string;
    presenter: string;
    attendees: string[];
  }>;
};

function createBaselineEvents(input: BaselineInput): Event[] {
  return [
    {
      eventType: "expoCreated",
      payload: {
        expoCreatedId: "expo-1",
        slotLengthMin: 60,
        slotStartingTimes: [
          new Date("2026-03-18T10:00:00.000Z"),
          new Date("2026-03-18T11:00:00.000Z"),
          new Date("2026-03-18T12:00:00.000Z"),
        ],
        days: [],
        rooms: ["Raum A", "Raum B", "Raum C"],
      },
    },
    {
      eventType: "attendeeRegistered",
      payload: {
        attendeeRegisteredId: attendeeId,
        attendeeId,
        name: "David",
        email: "david@example.com",
      },
    },
    {
      eventType: "attendeeRegistered",
      payload: {
        attendeeRegisteredId: "attendee-2",
        attendeeId: "attendee-2",
        name: "Eva",
        email: "eva@example.com",
      },
    },
    {
      eventType: "attendeeRegistered",
      payload: {
        attendeeRegisteredId: "attendee-3",
        attendeeId: "attendee-3",
        name: "Mia",
        email: "mia@example.com",
      },
    },
    {
      eventType: "presentationSubmitted",
      payload: {
        presentationSubmittedId: "pres-1",
        presentationId: "pres-1",
        title: "Event Sourcing 101",
        abstract: "Grundlagen",
        presenters: [attendeeId],
        coverImage: "",
      },
    },
    {
      eventType: "presentationSubmitted",
      payload: {
        presentationSubmittedId: "pres-2",
        presentationId: "pres-2",
        title: "Read Models",
        abstract: "Projektionsmuster",
        presenters: ["attendee-2"],
        coverImage: "",
      },
    },
    {
      eventType: "presentationSubmitted",
      payload: {
        presentationSubmittedId: "pres-3",
        presentationId: "pres-3",
        title: "Unrelated Session",
        abstract: "Nicht relevant",
        presenters: ["attendee-3"],
        coverImage: "",
      },
    },
    {
      eventType: "presentationsScheduled",
      payload: {
        presentationsScheduledId: "schedule-1",
        schedule: {
          from: new Date("2026-03-18T10:00:00.000Z"),
          until: new Date("2026-03-18T13:00:00.000Z"),
          slots: [{}, {}, {}],
          tracks: input.scheduleTracks,
        },
      },
    },
  ];
}

function createFallbackTimingEvents(): Event[] {
  return [
    {
      eventType: "expoCreated",
      payload: {
        expoCreatedId: "expo-1",
        slotLengthMin: 60,
        slotStartingTimes: [new Date("invalid-date")],
        days: [],
        rooms: ["Raum A"],
      },
    },
    {
      eventType: "attendeeRegistered",
      payload: {
        attendeeRegisteredId: attendeeId,
        attendeeId,
        name: "David",
        email: "david@example.com",
      },
    },
    {
      eventType: "presentationSubmitted",
      payload: {
        presentationSubmittedId: "pres-1",
        presentationId: "pres-1",
        title: "Event Sourcing 101",
        abstract: "Grundlagen",
        presenters: [attendeeId],
      },
    },
    {
      eventType: "presentationsScheduled",
      payload: {
        presentationsScheduledId: "schedule-1",
        schedule: {
          from: new Date("2026-03-18T10:00:00.000Z"),
          until: new Date("2026-03-18T12:00:00.000Z"),
          slots: [{}, {}],
          tracks: [
            {
              roomName: "Raum A",
              presentation: "pres-1",
              presenter: attendeeId,
              attendees: ["attendee-2"],
            },
          ],
        },
      },
    },
  ];
}
