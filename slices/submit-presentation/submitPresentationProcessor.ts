import {
	type Event,
	type EventQuery,
	type EventRecord,
	type EventStore,
	createFilter,
	createQuery,
} from "@ricofritzsche/eventstore";

export type SubmitPresentationCommand = {
	title: string;
	abstract: string;
	presenters: string[];
	coverImage: string;
};

export type SubmitPresentationResponse = {
	status: boolean;
	message: string;
	presentationSubmittedId?: string;
};

type SubmissionContextModel = {
	expoExists: boolean;
	submissionDeadline: Date | null;
	registeredAttendeeIds: Set<string>;
};

type LoadedContext = {
	query: EventQuery;
	events: EventRecord[];
	maxSequenceNumber: number;
};

export class SubmitPresentationProcessor {
	constructor(
		private readonly eventStore: EventStore,
		private readonly now: () => Date = () => new Date(),
	) {}

	async process(
		request: SubmitPresentationCommand,
	): Promise<SubmitPresentationResponse> {
		const plausibilityError = this.checkPlausibility(request);
		if (plausibilityError) {
			return plausibilityError;
		}

		const loadedContext = await this.loadContext(request);
		const contextModel = this.buildContextModel(loadedContext.events);

		const validationError = this.validateAgainstContext(request, contextModel);
		if (validationError) {
			return validationError;
		}

		const newEvents = this.createEvents(request);
		return this.appendEvents(newEvents, loadedContext, request);
	}

	private checkPlausibility(
		request: SubmitPresentationCommand,
	): SubmitPresentationResponse | null {
		if (!request.title.trim()) {
			return { status: false, message: "title is required." };
		}

		if (!request.abstract.trim()) {
			return { status: false, message: "abstract is required." };
		}

		if (!request.coverImage.trim()) {
			return { status: false, message: "coverImage is required." };
		}

		if (request.presenters.length === 0) {
			return { status: false, message: "At least one presenter is required." };
		}

		const uniquePresenters = new Set(request.presenters);
		if (uniquePresenters.size !== request.presenters.length) {
			return { status: false, message: "presenters must be unique." };
		}

		if ([...uniquePresenters].some((presenterId) => !presenterId.trim())) {
			return { status: false, message: "presenter ids must be non-empty." };
		}

		return null;
	}

	private async loadContext(
		request: SubmitPresentationCommand,
	): Promise<LoadedContext> {
		const expoFilter = createFilter(["expoCreated"]);

		const attendeeFilter = createFilter(
			["attendeeRegistered"],
			request.presenters.map((attendeeRegisteredId) => ({ attendeeRegisteredId })),
		);

		const query = createQuery(expoFilter, attendeeFilter);
		const result = await this.eventStore.query(query);

		return {
			query,
			events: result.events,
			maxSequenceNumber: result.maxSequenceNumber,
		};
	}

	private buildContextModel(events: EventRecord[]): SubmissionContextModel {
		const contextModel: SubmissionContextModel = {
			expoExists: false,
			submissionDeadline: null,
			registeredAttendeeIds: new Set<string>(),
		};

		for (const eventRecord of events) {
			if (eventRecord.eventType === "expoCreated") {
				contextModel.expoExists = true;

				const rawDeadline =
					this.getString(eventRecord.payload, "presentationSubmissionDeadline") ??
					this.getString(eventRecord.payload, "presenationSubmissionDeadline");

				if (rawDeadline) {
					const parsed = new Date(rawDeadline);
					if (!Number.isNaN(parsed.getTime())) {
						contextModel.submissionDeadline = parsed;
					}
				}

				continue;
			}

			if (eventRecord.eventType === "attendeeRegistered") {
				const attendeeRegisteredId = this.getString(
					eventRecord.payload,
					"attendeeRegisteredId",
				);

				if (attendeeRegisteredId) {
					contextModel.registeredAttendeeIds.add(attendeeRegisteredId);
				}
			}
		}

		return contextModel;
	}

	private validateAgainstContext(
		request: SubmitPresentationCommand,
		contextModel: SubmissionContextModel,
	): SubmitPresentationResponse | null {
		if (!contextModel.expoExists) {
			return { status: false, message: "expoCreated event not found." };
		}

		const missingPresenterIds = request.presenters.filter(
			(presenterId) => !contextModel.registeredAttendeeIds.has(presenterId),
		);

		if (missingPresenterIds.length > 0) {
			return {
				status: false,
				message: `Unknown presenters: ${missingPresenterIds.join(", ")}.`,
			};
		}

		const submittedAt = this.now();
		if (
			contextModel.submissionDeadline &&
			submittedAt.getTime() > contextModel.submissionDeadline.getTime()
		) {
			return {
				status: false,
				message: "Presentation submission deadline has passed.",
			};
		}

		return null;
	}

	private createEvents(request: SubmitPresentationCommand): Event[] {
		const presentationSubmittedId = crypto.randomUUID();

		return [
			{
				eventType: "presentationSubmitted",
				payload: {
					presentationSubmittedId,
					presentationId: presentationSubmittedId,
					title: request.title.trim(),
					abstract: request.abstract.trim(),
					coverImage: request.coverImage.trim(),
				},
			},
			...request.presenters.map((attendeeRegisteredId) => ({
				eventType: "presenterAssigned",
				payload: {
					presenterAssignedId: crypto.randomUUID(),
					scopes: {
						attendeeRegisteredId,
						presentationSubmittedId,
					},
				},
			})),
		];
	}

	private async appendEvents(
		newEvents: Event[],
		loadedContext: LoadedContext,
		_request: SubmitPresentationCommand,
	): Promise<SubmitPresentationResponse> {
		try {
			await this.eventStore.append(
				newEvents,
				loadedContext.query,
				loadedContext.maxSequenceNumber,
			);

			const firstEventPayload = newEvents[0]?.payload;
			const presentationSubmittedId =
				firstEventPayload && "presentationSubmittedId" in firstEventPayload
					? (firstEventPayload.presentationSubmittedId as string)
					: undefined;

			return {
				status: true,
				message: "Presentation submitted.",
				presentationSubmittedId,
			};
		} catch (error) {
			if (this.isOptimisticLockConflict(error)) {
				return {
					status: false,
					message:
						"Presentation submission conflicted with concurrent updates. Please retry.",
				};
			}

			throw error;
		}
	}

	private getString(
		payload: Record<string, unknown>,
		key: string,
	): string | null {
		const value = payload[key];
		return typeof value === "string" ? value : null;
	}

	private isOptimisticLockConflict(error: unknown): boolean {
		if (!(error instanceof Error)) {
			return false;
		}

		const normalized = error.message.toLowerCase();
		return normalized.includes("optimistic") && normalized.includes("lock");
	}
}
