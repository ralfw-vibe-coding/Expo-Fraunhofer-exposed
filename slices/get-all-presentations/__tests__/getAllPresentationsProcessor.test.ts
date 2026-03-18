import type { EventFilter, EventRecord, EventStore, QueryResult } from "@ricofritzsche/eventstore";
import { describe, expect, it, vi } from "vitest";

import {
	GetAllPresentationsProcessor,
	type GetAllPresentationsQuery,
} from "../getAllPresentationsProcessor";

type MockedEventStore = EventStore & {
	query: ReturnType<typeof vi.fn>;
};

describe("GetAllPresentationsProcessor", () => {
	it("queries presentationSubmitted events and returns titles, abstracts, and cover images", async () => {
		const queryResult = createQueryResult([
			createPresentationSubmittedRecord({
				presentationSubmittedId: "presentation-1",
				title: "Event Sourcing 101",
				abstract: "An introduction to event-sourced systems.",
				coverImage: "https://example.com/es-101.png",
			}),
			createPresentationSubmittedRecord({
				presentationSubmittedId: "presentation-2",
				title: "Async Projections",
				abstract: "How to build stable read models.",
				coverImage: "https://example.com/projections.png",
			}),
		]);
		const eventStore = createEventStoreStub(queryResult);
		const processor = new GetAllPresentationsProcessor(eventStore);

		const result = await processor.process(createQuery());

		expect(eventStore.query).toHaveBeenCalledWith({
			eventTypes: ["presentationSubmitted"],
		});
		expect(result).toEqual({
			presentations: [
				{
					presentationId: "presentation-1",
					title: "Event Sourcing 101",
					abstract: "An introduction to event-sourced systems.",
					coverImage: "https://example.com/es-101.png",
				},
				{
					presentationId: "presentation-2",
					title: "Async Projections",
					abstract: "How to build stable read models.",
					coverImage: "https://example.com/projections.png",
				},
			],
		});
	});

	it("returns an empty list when no presentations were submitted", async () => {
		const eventStore = createEventStoreStub(createQueryResult([]));
		const processor = new GetAllPresentationsProcessor(eventStore);

		const result = await processor.process(createQuery());

		expect(result).toEqual({ presentations: [] });
	});

	it("throws when a presentationSubmitted event payload is incomplete", async () => {
		const eventStore = createEventStoreStub(
			createQueryResult([
				createPresentationSubmittedRecord({
					presentationSubmittedId: "presentation-1",
					title: "Broken payload",
					abstract: "Missing cover image should surface as technical error.",
					coverImage: 42,
				}),
			]),
		);
		const processor = new GetAllPresentationsProcessor(eventStore);

		await expect(processor.process(createQuery())).rejects.toThrow(
			'Expected presentationSubmitted payload field "coverImage" to be a non-empty string.',
		);
	});
});

function createQuery(): GetAllPresentationsQuery {
	return {};
}

function createEventStoreStub(queryResult: QueryResult): MockedEventStore {
	const query = vi.fn(async (_filter: EventFilter) => queryResult);

	return {
		query,
		append: vi.fn(async () => undefined),
		subscribe: vi.fn(async () => ({
			id: "subscription-1",
			unsubscribe: async () => undefined,
		})),
	} as unknown as MockedEventStore;
}

function createQueryResult(events: EventRecord[]): QueryResult {
	return {
		events,
		maxSequenceNumber: events.at(-1)?.sequenceNumber ?? 0,
	};
}

function createPresentationSubmittedRecord(payload: {
	presentationSubmittedId: unknown;
	title: unknown;
	abstract: unknown;
	coverImage: unknown;
}): EventRecord {
	return {
		eventType: "presentationSubmitted",
		payload,
		sequenceNumber: 1,
		timestamp: new Date("2026-03-18T10:00:00.000Z"),
	};
}
