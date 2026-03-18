import { MemoryEventStore, createFilter } from "@ricofritzsche/eventstore";
import { describe, expect, it } from "vitest";

import { SubmitPresentationProcessor } from "../submitPresentationProcessor";

describe("SubmitPresentationCommandProcessor", () => {
  it("appends presentationSubmitted when expo and presenters exist", async () => {
    const store = new MemoryEventStore();
    const processor = new SubmitPresentationProcessor(
      store,
      () => new Date("2026-03-10T10:00:00.000Z"),
    );

    await store.append([
      {
        eventType: "expoCreated",
        payload: {
          presentationSubmissionDeadline: "2026-03-20T23:59:59.000Z",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "att-1",
          name: "Ada",
          email: "ada@example.com",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "att-2",
          name: "Grace",
          email: "grace@example.com",
        },
      },
    ]);

    const result = await processor.process({
      title: "Event Sourcing in the Browser",
      abstract: "A practical walk-through for reactive event-sourced UIs.",
      presenters: ["att-1", "att-2"],
      coverImage: "https://cdn.example.org/cover.png",
    });

    expect(result.status).toBe(true);
    expect(result.message).toBe("Presentation submitted.");
    expect(result.presentationSubmittedId).toEqual(expect.any(String));

    const stored = await store.query(
      createFilter(["presentationSubmitted"], [
        { presentationSubmittedId: result.presentationSubmittedId },
      ]),
    );

    const presenterAssignments = await store.query(
      createFilter(["presenterAssigned"]),
    );

    expect(stored.events).toHaveLength(1);
    expect(stored.events[0].payload).toMatchObject({
      presentationSubmittedId: result.presentationSubmittedId,
      title: "Event Sourcing in the Browser",
      abstract: "A practical walk-through for reactive event-sourced UIs.",
      coverImage: "https://cdn.example.org/cover.png",
    });

    expect(presenterAssignments.events).toHaveLength(2);
    expect(
      presenterAssignments.events.map((event) => event.payload),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scopes: {
            attendeeRegisteredId: "att-1",
            presentationSubmittedId: result.presentationSubmittedId,
          },
        }),
        expect.objectContaining({
          scopes: {
            attendeeRegisteredId: "att-2",
            presentationSubmittedId: result.presentationSubmittedId,
          },
        }),
      ]),
    );
  });

  it("returns status false when expo does not exist", async () => {
    const store = new MemoryEventStore();
    const processor = new SubmitPresentationProcessor(store);

    await store.append([
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "att-1",
          name: "Ada",
          email: "ada@example.com",
        },
      },
    ]);

    const result = await processor.process({
      title: "Missing Expo",
      abstract: "Should fail",
      presenters: ["att-1"],
      coverImage: "https://cdn.example.org/cover.png",
    });

    expect(result).toEqual({
      status: false,
      message: "expoCreated event not found.",
    });
  });

  it("returns status false when presenter is not registered", async () => {
    const store = new MemoryEventStore();
    const processor = new SubmitPresentationProcessor(store);

    await store.append([
      {
        eventType: "expoCreated",
        payload: {
          presentationSubmissionDeadline: "2026-03-20T23:59:59.000Z",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "att-1",
          name: "Ada",
          email: "ada@example.com",
        },
      },
    ]);

    const result = await processor.process({
      title: "Unregistered Presenter",
      abstract: "Should fail",
      presenters: ["att-1", "att-404"],
      coverImage: "https://cdn.example.org/cover.png",
    });

    expect(result).toEqual({
      status: false,
      message: "Unknown presenters: att-404.",
    });
  });

  it("returns status false when the submission deadline has passed", async () => {
    const store = new MemoryEventStore();
    const processor = new SubmitPresentationProcessor(
      store,
      () => new Date("2026-03-21T00:00:00.000Z"),
    );

    await store.append([
      {
        eventType: "expoCreated",
        payload: {
          presentationSubmissionDeadline: "2026-03-20T23:59:59.000Z",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "att-1",
          name: "Ada",
          email: "ada@example.com",
        },
      },
    ]);

    const result = await processor.process({
      title: "Too Late",
      abstract: "Should fail",
      presenters: ["att-1"],
      coverImage: "https://cdn.example.org/cover.png",
    });

    expect(result).toEqual({
      status: false,
      message: "Presentation submission deadline has passed.",
    });
  });
});
