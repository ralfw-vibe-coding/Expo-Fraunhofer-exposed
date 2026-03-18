import { MemoryEventStore } from "@ricofritzsche/eventstore";
import {
  CreateExpoProcessor,
  EXPO_CREATED_EVENT_TYPE,
  type CreateExpoCommand,
} from "../createExpoProcessor";

describe("CreateExpoProcessor", () => {
  it("creates an expoCreated event with normalized date payloads", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new CreateExpoProcessor(eventStore);
    const command: CreateExpoCommand = {
      expoCreatedId: "expo-created-1",
      days: [
        {
          date: "2026-04-15T00:00:00.000Z",
          numberTracks: 3,
          slotLengthMin: 45,
          slotStartingTimes: ["2026-04-15T09:00:00.000Z", "2026-04-15T10:00:00.000Z"],
        },
      ],
      presentationSubmissionDeadline: "2026-04-01T12:00:00.000Z",
      prefSubmissionDeadline: "2026-04-05T12:00:00.000Z",
    };

    const response = await processor.process(command);
    const result = await eventStore.query();

    expect(response).toEqual({
      status: true,
      message: "Expo was created.",
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      eventType: EXPO_CREATED_EVENT_TYPE,
      payload: {
        expoCreatedId: "expo-created-1",
        days: [
          {
            date: "2026-04-15T00:00:00.000Z",
            numberTracks: 3,
            slotLengthMin: 45,
            slotStartingTimes: ["2026-04-15T09:00:00.000Z", "2026-04-15T10:00:00.000Z"],
          },
        ],
        presentationSubmissionDeadline: "2026-04-01T12:00:00.000Z",
        prefSubmissionDeadline: "2026-04-05T12:00:00.000Z",
      },
    });
  });

  it("allows a second expoCreated command and keeps the newest version as the latest event", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new CreateExpoProcessor(eventStore);
    const command: CreateExpoCommand = {
      expoCreatedId: "expo-created-1",
      days: [
        {
          date: "2026-04-15T00:00:00.000Z",
          numberTracks: 3,
          slotLengthMin: 45,
          slotStartingTimes: ["2026-04-15T09:00:00.000Z"],
        },
      ],
      presentationSubmissionDeadline: "2026-04-01T12:00:00.000Z",
      prefSubmissionDeadline: "2026-04-05T12:00:00.000Z",
    };

    const firstResponse = await processor.process(command);

    const response = await processor.process({
      ...command,
      expoCreatedId: "expo-created-2",
      days: [
        {
          date: "2026-04-16T00:00:00.000Z",
          numberTracks: 4,
          slotLengthMin: 30,
          slotStartingTimes: ["2026-04-16T08:30:00.000Z", "2026-04-16T09:00:00.000Z"],
        },
      ],
    });
    const result = await eventStore.query();

    expect(firstResponse).toEqual({
      status: true,
      message: "Expo was created.",
    });
    expect(response).toEqual({
      status: true,
      message: "Expo was created.",
    });
    expect(result.events).toHaveLength(2);
    expect(result.events[1]).toMatchObject({
      eventType: EXPO_CREATED_EVENT_TYPE,
      payload: {
        expoCreatedId: "expo-created-2",
        days: [
          {
            date: "2026-04-16T00:00:00.000Z",
            numberTracks: 4,
            slotLengthMin: 30,
            slotStartingTimes: ["2026-04-16T08:30:00.000Z", "2026-04-16T09:00:00.000Z"],
          },
        ],
      },
    });
  });

  it("rejects a command when the presentation deadline is after the preference deadline", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new CreateExpoProcessor(eventStore);

    const response = await processor.process({
      expoCreatedId: "expo-created-1",
      days: [
        {
          date: "2026-04-15T00:00:00.000Z",
          numberTracks: 3,
          slotLengthMin: 45,
          slotStartingTimes: ["2026-04-15T09:00:00.000Z"],
        },
      ],
      presentationSubmissionDeadline: "2026-04-06T12:00:00.000Z",
      prefSubmissionDeadline: "2026-04-05T12:00:00.000Z",
    });
    const result = await eventStore.query();

    expect(response).toEqual({
      status: false,
      message: "presentationSubmissionDeadline must be earlier than or equal to prefSubmissionDeadline.",
    });
    expect(result.events).toHaveLength(0);
  });

  it("rejects a command when a day has no slot starting times", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new CreateExpoProcessor(eventStore);

    const response = await processor.process({
      expoCreatedId: "expo-created-1",
      days: [
        {
          date: "2026-04-15T00:00:00.000Z",
          numberTracks: 3,
          slotLengthMin: 45,
          slotStartingTimes: [],
        },
      ],
      presentationSubmissionDeadline: "2026-04-01T12:00:00.000Z",
      prefSubmissionDeadline: "2026-04-05T12:00:00.000Z",
    });
    const result = await eventStore.query();

    expect(response).toEqual({
      status: false,
      message: "days[0].slotStartingTimes must contain at least one entry.",
    });
    expect(result.events).toHaveLength(0);
  });
});
