import {
  MemoryEventStore,
  createFilter,
  createQuery,
} from "@ricofritzsche/eventstore";

import {
  ATTENDEE_REGISTERED_EVENT_TYPE,
  RegisterAttendeesCommandProcessor,
} from "../registerAttendeesProcessor";

describe("RegisterAttendeesCommandProcessor", () => {
  it("registers one attendeeRegistered event per attendee", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new RegisterAttendeesCommandProcessor(eventStore);

    const response = await processor.process({
      attendees: [
        { name: "Ada Lovelace", email: "ada@example.com" },
        { name: "Grace Hopper", email: "grace@example.com" },
      ],
    });

    const query = createQuery(createFilter([ATTENDEE_REGISTERED_EVENT_TYPE]));
    const result = await eventStore.query(query);

    expect(response.status).toBe(true);
    expect(response.registeredCount).toBe(2);
    expect(response.attendeeRegisteredIds).toHaveLength(2);
    expect(result.events).toHaveLength(2);
    expect(result.events.map((event) => event.payload)).toEqual([
      expect.objectContaining({
        name: "Ada Lovelace",
        email: "ada@example.com",
      }),
      expect.objectContaining({
        name: "Grace Hopper",
        email: "grace@example.com",
      }),
    ]);
  });

  it("rejects duplicate emails without appending events", async () => {
    const eventStore = new MemoryEventStore();
    const processor = new RegisterAttendeesCommandProcessor(eventStore);

    const response = await processor.process({
      attendees: [
        { name: "Ada Lovelace", email: "ada@example.com" },
        { name: "Ada Again", email: "ADA@example.com" },
      ],
    });

    const query = createQuery(createFilter([ATTENDEE_REGISTERED_EVENT_TYPE]));
    const result = await eventStore.query(query);

    expect(response.status).toBe(false);
    expect(response.message).toContain("appears more than once");
    expect(result.events).toHaveLength(0);
  });
});
