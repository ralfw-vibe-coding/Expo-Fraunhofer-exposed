import { createFilter, type EventRecord, type EventStore } from "@ricofritzsche/eventstore";

const TIMELINE_EVENT_TYPES = [
	"expoCreated",
	"presentationSubmitted",
	"attendeeRegistered",
	"presentationsScheduled",
];

export type GetMyTimelineQuery = {
	attendeeId: string;
};

export type TimelineSession = {
	presentationId: string;
	title: string;
	abstract: string;
	roomName: string;
	presenterId: string;
	presenterName: string;
	attendeeIds: string[];
	startTime: string;
	endTime: string;
};

export type GetMyTimelineQueryResponse = {
	attendeeId: string;
	sessions: TimelineSession[];
};

type AttendeeRegistration = {
	attendeeId: string;
	name: string;
};

type PresentationSubmission = {
	presentationId: string;
	title: string;
	abstract: string;
	presenterIds: string[];
};

type ExpoConfig = {
	slotLengthMin: number;
};

type ScheduleTrack = {
	roomName: string;
	presentationId: string;
	presenterId: string;
	attendeeIds: string[];
};

type ScheduleSlot = {
	from: Date | null;
	until: Date | null;
	tracks: ScheduleTrack[];
};

type Schedule = {
	slots: ScheduleSlot[];
};

type TimelineContextModel = {
	expo: ExpoConfig | null;
	attendeesById: Map<string, AttendeeRegistration>;
	presentationsById: Map<string, PresentationSubmission>;
	schedule: Schedule | null;
};

export class GetMyTimelineQueryProcessor {
	constructor(private readonly eventStore: EventStore) {}

	async process(request: GetMyTimelineQuery): Promise<GetMyTimelineQueryResponse> {
		this.checkPlausibility(request);

		const context = await this.loadContext();
		const contextModel = this.buildContextModel(context);

		return this.projectResultModel(request, contextModel);
	}

	private checkPlausibility(request: GetMyTimelineQuery): void {
		if (!request.attendeeId || request.attendeeId.trim().length === 0) {
			throw new Error("attendeeId is required");
		}
	}

	private async loadContext(): Promise<EventRecord[]> {
		const filter = createFilter(TIMELINE_EVENT_TYPES);
		const queryResult = await this.eventStore.query(filter);
		return queryResult.events;
	}

	private buildContextModel(events: EventRecord[]): TimelineContextModel {
		const sortedEvents = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

		let expo: ExpoConfig | null = null;
		let schedule: Schedule | null = null;
		const attendeesById = new Map<string, AttendeeRegistration>();
		const presentationsById = new Map<string, PresentationSubmission>();

		for (const event of sortedEvents) {
			if (event.eventType === "expoCreated") {
				const parsedExpo = this.parseExpoConfig(event.payload);
				if (parsedExpo) {
					expo = parsedExpo;
				}
				continue;
			}

			if (event.eventType === "attendeeRegistered") {
				const attendee = this.parseAttendeeRegistration(event.payload);
				if (attendee) {
					attendeesById.set(attendee.attendeeId, attendee);
				}
				continue;
			}

			if (event.eventType === "presentationSubmitted") {
				const submission = this.parsePresentationSubmission(event.payload);
				if (submission) {
					presentationsById.set(submission.presentationId, submission);
				}
				continue;
			}

			if (event.eventType === "presentationsScheduled") {
				const parsedSchedule = this.parseSchedule(event.payload);
				if (parsedSchedule) {
					schedule = parsedSchedule;
				}
			}
		}

		return {
			expo,
			attendeesById,
			presentationsById,
			schedule,
		};
	}

	private projectResultModel(
		request: GetMyTimelineQuery,
		contextModel: TimelineContextModel,
	): GetMyTimelineQueryResponse {
		if (!contextModel.schedule || contextModel.schedule.slots.length === 0) {
			return {
				attendeeId: request.attendeeId,
				sessions: [],
			};
		}

		const sessions = contextModel.schedule.slots
			.flatMap((slot, index) =>
				slot.tracks.map((track) => {
					const start = this.resolveSlotStart(contextModel, slot, index);
					const end = this.resolveSlotEnd(contextModel, slot, start);
					if (!start || !end) {
						return null;
					}

					const presentation = contextModel.presentationsById.get(track.presentationId);
					const presenter = contextModel.attendeesById.get(track.presenterId);
					const isResponsible =
						track.presenterId === request.attendeeId ||
						(presentation?.presenterIds.includes(request.attendeeId) ?? false);
					const isRelevant =
						isResponsible || track.attendeeIds.includes(request.attendeeId);

					if (!isRelevant) {
						return null;
					}

					return {
						presentationId: track.presentationId,
						title: presentation?.title ?? track.presentationId,
						abstract: presentation?.abstract ?? "",
						roomName: track.roomName,
						presenterId: track.presenterId,
						presenterName: presenter?.name ?? track.presenterId,
						attendeeIds: [...track.attendeeIds],
						startTime: start.toISOString(),
						endTime: end.toISOString(),
					} as TimelineSession;
				}),
			)
			.filter((session): session is TimelineSession => session !== null)
			.sort((a, b) => a.startTime.localeCompare(b.startTime));

		return {
			attendeeId: request.attendeeId,
			sessions,
		};
	}

	private resolveSlotStart(
		contextModel: TimelineContextModel,
		slot: ScheduleSlot,
		index: number,
	): Date | null {
		if (slot.from) {
			return slot.from;
		}

		if (!contextModel.expo || index === 0) {
			return null;
		}

		const previousSlot = contextModel.schedule?.slots[index - 1];
		if (!previousSlot?.from) {
			return null;
		}

		return new Date(
			previousSlot.from.getTime() + contextModel.expo.slotLengthMin * 60_000,
		);
	}

	private resolveSlotEnd(
		contextModel: TimelineContextModel,
		slot: ScheduleSlot,
		start: Date | null,
	): Date | null {
		if (slot.until) {
			return slot.until;
		}

		if (!start || !contextModel.expo) {
			return null;
		}

		return new Date(start.getTime() + contextModel.expo.slotLengthMin * 60_000);
	}

	private parseExpoConfig(payload: Record<string, unknown>): ExpoConfig | null {
		const slotLengthMin =
			this.readNumber(payload.slotLengthMin) ??
			this.readSlotLengthFromDays(payload.days);

		if (slotLengthMin === null) {
			return null;
		}

		return {
			slotLengthMin,
		};
	}

	private parseAttendeeRegistration(payload: Record<string, unknown>): AttendeeRegistration | null {
		const attendeeId = this.readString(payload.attendeeId) ?? this.readString(payload.attendeeRegisteredId);
		if (!attendeeId) {
			return null;
		}

		return {
			attendeeId,
			name: this.readString(payload.name) ?? attendeeId,
		};
	}

	private parsePresentationSubmission(payload: Record<string, unknown>): PresentationSubmission | null {
		const presentationId =
			this.readString(payload.presentationId) ??
			this.readString(payload.presentationSubmittedId) ??
			this.readString(payload.title);

		if (!presentationId) {
			return null;
		}

		return {
			presentationId,
			title: this.readString(payload.title) ?? presentationId,
			abstract: this.readString(payload.abstract) ?? "",
			presenterIds: this.readStringArray(payload.presenters),
		};
	}

	private parseSchedule(payload: Record<string, unknown>): Schedule | null {
		const scheduleRecord = this.asRecord(payload.schedule);
		if (!scheduleRecord) {
			return null;
		}

		const slotsFromNewShape = this.parseScheduleSlots(scheduleRecord);
		if (slotsFromNewShape.length > 0) {
			return {
				slots: slotsFromNewShape,
			};
		}

		const tracksRaw = Array.isArray(scheduleRecord.tracks) ? scheduleRecord.tracks : [];
		const tracks: ScheduleTrack[] = [];

		for (const trackRaw of tracksRaw) {
			const trackRecord = this.asRecord(trackRaw);
			if (!trackRecord) {
				continue;
			}

			const presentationId = this.readString(trackRecord.presentation);
			const presenterId = this.readString(trackRecord.presenter);
			if (!presentationId || !presenterId) {
				continue;
			}

			tracks.push({
				roomName: this.readString(trackRecord.roomName) ?? "",
				presentationId,
				presenterId,
				attendeeIds: this.readStringArray(trackRecord.attendees),
			});
		}

		if (tracks.length === 0) {
			return null;
		}

		const baseFrom = this.readDate(scheduleRecord.from);
		return {
			slots: tracks.map((track, index) => ({
				from: index === 0 ? baseFrom : null,
				until: null,
				tracks: [track],
			})),
		};
	}

	private parseScheduleSlots(scheduleRecord: Record<string, unknown>): ScheduleSlot[] {
		const slotsRaw = Array.isArray(scheduleRecord.slots) ? scheduleRecord.slots : [];

		return slotsRaw
			.map((slotRaw) => {
				const slotRecord = this.asRecord(slotRaw);
				if (!slotRecord) {
					return null;
				}

				const tracksRaw = Array.isArray(slotRecord.tracks) ? slotRecord.tracks : [];
				const tracks: ScheduleTrack[] = [];

				for (const trackRaw of tracksRaw) {
					const trackRecord = this.asRecord(trackRaw);
					if (!trackRecord) {
						continue;
					}

					const presentationId =
						this.readString(trackRecord.presentation) ??
						this.readString(trackRecord.presentationId);
					const presenterId =
						this.readString(trackRecord.presenter) ??
						this.readString(trackRecord.presenterId);

					if (!presentationId || !presenterId) {
						continue;
					}

					tracks.push({
						roomName: this.readString(trackRecord.roomName) ?? "",
						presentationId,
						presenterId,
						attendeeIds: this.readStringArray(trackRecord.attendees),
					});
				}

				if (tracks.length === 0) {
					return null;
				}

				return {
					from: this.readDate(slotRecord.from),
					until: this.readDate(slotRecord.until),
					tracks,
				} as ScheduleSlot;
			})
			.filter((slot): slot is ScheduleSlot => slot !== null);
	}

	private asRecord(value: unknown): Record<string, unknown> | null {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return null;
		}

		return value as Record<string, unknown>;
	}

	private readString(value: unknown): string | null {
		if (typeof value !== "string") {
			return null;
		}

		const trimmed = value.trim();
		return trimmed.length === 0 ? null : trimmed;
	}

	private readStringArray(value: unknown): string[] {
		if (!Array.isArray(value)) {
			return [];
		}

		return value
			.map((entry) => this.readString(entry))
			.filter((entry): entry is string => entry !== null);
	}

	private readNumber(value: unknown): number | null {
		if (typeof value === "number" && Number.isFinite(value)) {
			return value;
		}

		return null;
	}

	private readDate(value: unknown): Date | null {
		if (value instanceof Date && !Number.isNaN(value.getTime())) {
			return value;
		}

		if (typeof value === "string") {
			const parsed = new Date(value);
			if (!Number.isNaN(parsed.getTime())) {
				return parsed;
			}
		}

		return null;
	}

	private readDateArray(value: unknown): Date[] {
		if (!Array.isArray(value)) {
			return [];
		}

		return value
			.map((entry) => this.readDate(entry))
			.filter((entry): entry is Date => entry !== null)
			.sort((a, b) => a.getTime() - b.getTime());
	}

	private readSlotLengthFromDays(value: unknown): number | null {
		if (!Array.isArray(value)) {
			return null;
		}

		for (const day of value) {
			const dayRecord = this.asRecord(day);
			if (!dayRecord) {
				continue;
			}

			const slotLengthMin =
				this.readNumber(dayRecord.slotLengthMin) ??
				this.readNumber(dayRecord.slotLengthInMin);
			if (slotLengthMin !== null) {
				return slotLengthMin;
			}
		}

		return null;
	}
}

