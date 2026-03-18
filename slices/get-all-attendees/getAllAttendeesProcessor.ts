import { createFilter, type EventRecord, type EventStore } from "@ricofritzsche/eventstore";

export type GetAllAttendeesQuery = Record<string, never>;

export type AttendeeListItem = {
	attendeeRegisteredId: string;
	name: string;
	email: string;
};

export type GetAllAttendeesResponse = {
	attendees: AttendeeListItem[];
};

export class GetAllAttendeesProcessor {
	constructor(private readonly eventStore: EventStore) {}

	async process(request: GetAllAttendeesQuery): Promise<GetAllAttendeesResponse> {
		this.checkPlausibility(request);
		const context = await this.loadContext();
		const attendees = this.buildContextModel(context);

		return this.projectResultModel(attendees);
	}

	private checkPlausibility(request: GetAllAttendeesQuery): void {
		if (Object.keys(request).length > 0) {
			throw new Error("GetAllAttendeesQuery must be empty.");
		}
	}

	private async loadContext(): Promise<EventRecord[]> {
		const attendeeFilter = createFilter(["attendeeRegistered"]);
		const queryResult = await this.eventStore.query(attendeeFilter);

		return queryResult.events;
	}

	private buildContextModel(events: EventRecord[]): AttendeeListItem[] {
		return events
			.map((event) => this.toAttendeeListItem(event.payload))
			.filter((attendee): attendee is AttendeeListItem => attendee !== null);
	}

	private toAttendeeListItem(payload: Record<string, unknown>): AttendeeListItem | null {
		const attendeeRegisteredId = payload["attendeeRegisteredId"];
		const name = payload["name"];
		const email = payload["email"];

		if (
			typeof attendeeRegisteredId !== "string" ||
			typeof name !== "string" ||
			typeof email !== "string"
		) {
			return null;
		}

		return { attendeeRegisteredId, name, email };
	}

	private projectResultModel(attendees: AttendeeListItem[]): GetAllAttendeesResponse {
		const sortedAttendees = [...attendees].sort((left, right) =>
			left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
		);

		return { attendees: sortedAttendees };
	}
}

