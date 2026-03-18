import { MemoryEventStore } from "@ricofritzsche/eventstore";
import {
  GetAllAttendeesProcessor,
  type GetAllAttendeesQuery,
} from "../getAllAttendeesProcessor";

describe("GetAllAttendeesProcessor", () => {
  const emptyQuery: GetAllAttendeesQuery = {};

  it("returns an empty attendee list when no attendeeRegistered events exist", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new GetAllAttendeesProcessor(eventStore);

    const result = await processor.process(emptyQuery);

    expect(result).toEqual({ attendees: [] });
  });

  it("returns names and emails from attendeeRegistered events", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new GetAllAttendeesProcessor(eventStore);

    await eventStore.append([
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "evt-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "evt-2",
          name: "Alan Turing",
          email: "alan@example.com",
        },
      },
    ]);

    const result = await processor.process(emptyQuery);

    expect(result).toEqual({
      attendees: [
        {
          attendeeRegisteredId: "evt-1",
          name: "Ada Lovelace",
          email: "ada@example.com",
        },
        {
          attendeeRegisteredId: "evt-2",
          name: "Alan Turing",
          email: "alan@example.com",
        },
      ],
    });
  });

  it("ignores events that are not attendeeRegistered", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new GetAllAttendeesProcessor(eventStore);

    await eventStore.append([
      {
        eventType: "expoCreated",
        payload: {
          expoCreatedId: "expo-1",
          title: "Expo Fraunhofer Exposed",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "evt-3",
          name: "Grace Hopper",
          email: "grace@example.com",
        },
      },
    ]);

    const result = await processor.process(emptyQuery);

    expect(result).toEqual({
      attendees: [
        {
          attendeeRegisteredId: "evt-3",
          name: "Grace Hopper",
          email: "grace@example.com",
        },
      ],
    });
  });

  it("returns attendees sorted alphabetically by name", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new GetAllAttendeesProcessor(eventStore);

    await eventStore.append([
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "evt-4",
          name: "Zoe Zeta",
          email: "zoe@example.com",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "evt-5",
          name: "Adam Aster",
          email: "adam@example.com",
        },
      },
      {
        eventType: "attendeeRegistered",
        payload: {
          attendeeRegisteredId: "evt-6",
          name: "Mia Moore",
          email: "mia@example.com",
        },
      },
    ]);

    const result = await processor.process(emptyQuery);

    expect(result).toEqual({
      attendees: [
        {
          attendeeRegisteredId: "evt-5",
          name: "Adam Aster",
          email: "adam@example.com",
        },
        {
          attendeeRegisteredId: "evt-6",
          name: "Mia Moore",
          email: "mia@example.com",
        },
        {
          attendeeRegisteredId: "evt-4",
          name: "Zoe Zeta",
          email: "zoe@example.com",
        },
      ],
    });
  });
});
