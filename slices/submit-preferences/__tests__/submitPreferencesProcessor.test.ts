import { createFilter, MemoryEventStore } from "@ricofritzsche/eventstore";
import {
  SubmitPreferencesProcessor,
  type SubmitPreferencesCommand,
} from "../submitPreferencesProcessor";

describe("SubmitPreferencesProcessor", () => {
  it("appends a preferencesSubmitted event when the context is valid", async () => {
    const eventStore = new MemoryEventStore();
    await seedValidContext(eventStore);

    const processor = new SubmitPreferencesProcessor(
      eventStore,
      () => new Date("2026-03-18T12:00:00.000Z"),
    );

    const response = await processor.process({
      attendeeId: "attendee-1",
      presentationIds: ["presentation-1", "presentation-2"],
    });

    expect(response.status).toBe(true);
    expect(response.preferencesSubmittedId).toBeDefined();

    const result = await eventStore.query(
      createFilter(["preferencesSubmitted"]),
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.payload).toMatchObject({
      attendeeId: "attendee-1",
      presentationIds: ["presentation-1", "presentation-2"],
    });
    expect(result.events[0]?.payload.preferencesSubmittedId).toBe(
      response.preferencesSubmittedId,
    );
  });

  it("rejects submissions after the preference submission deadline", async () => {
    const eventStore = new MemoryEventStore();
    await seedValidContext(eventStore, "2026-03-17T12:00:00.000Z");

    const processor = new SubmitPreferencesProcessor(
      eventStore,
      () => new Date("2026-03-18T12:00:00.000Z"),
    );

    const response = await processor.process({
      attendeeId: "attendee-1",
      presentationIds: ["presentation-1"],
    });

    expect(response).toEqual({
      status: false,
      message:
        "Preferences cannot be submitted after the preference submission deadline.",
    });
  });

  it("rejects submissions when referenced presentations are missing", async () => {
    const eventStore = new MemoryEventStore();
    await seedValidContext(eventStore);

    const processor = new SubmitPreferencesProcessor(
      eventStore,
      () => new Date("2026-03-18T12:00:00.000Z"),
    );

    const response = await processor.process({
      attendeeId: "attendee-1",
      presentationIds: ["presentation-1", "presentation-404"],
    });

    expect(response).toEqual({
      status: false,
      message:
        "Preferences cannot be submitted because presentations are missing: presentation-404.",
    });
  });

  it("rejects duplicate presentation ids in the request", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new SubmitPreferencesProcessor(eventStore);

    const response = await processor.process({
      attendeeId: "attendee-1",
      presentationIds: ["presentation-1", "presentation-1"],
    });

    expect(response).toEqual({
      status: false,
      message: "presentationIds must be unique.",
    });
  });

  it("accepts legacy attendee and presentation ids from older events", async () => {
    const eventStore = new MemoryEventStore();
    await eventStore.append([
      {
        eventType: "expoCreated",
        payload: {
          expoCreatedId: "expo-created-legacy",
          prefSubmissionDeadline: "2026-03-20T12:00:00.000Z",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "legacy-attendee-1",
          name: "Grace Hopper",
          email: "grace@example.com",
        },
      },
      {
        eventType: "presentationSubmitted",
        payload: {
          presentationSubmittedId: "legacy-presentation-1",
          title: "Legacy talk",
        },
      },
    ]);

    const processor = new SubmitPreferencesProcessor(
      eventStore,
      () => new Date("2026-03-18T12:00:00.000Z"),
    );

    const response = await processor.process({
      attendeeId: "legacy-attendee-1",
      presentationIds: ["legacy-presentation-1"],
    });

    expect(response.status).toBe(true);
    expect(response.preferencesSubmittedId).toBeDefined();
  });
});

async function seedValidContext(
  eventStore: MemoryEventStore,
  prefSubmissionDeadline = "2026-03-20T12:00:00.000Z",
): Promise<void> {
  await eventStore.append([
    {
      eventType: "expoCreated",
      payload: {
        expoCreatedId: "expo-created-1",
        prefSubmissionDeadline,
      },
    },
    {
      eventType: "attendeeRegistered",
      payload: {
        attendeeRegisteredId: "attendee-registered-1",
        attendeeId: "attendee-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
      },
    },
    {
      eventType: "presentationSubmitted",
      payload: {
        presentationSubmittedId: "presentation-submitted-1",
        presentationId: "presentation-1",
        title: "Event Sourcing 101",
      },
    },
    {
      eventType: "presentationSubmitted",
      payload: {
        presentationSubmittedId: "presentation-submitted-2",
        presentationId: "presentation-2",
        title: "Projection Patterns",
      },
    },
  ]);
}
