import type { EventFilter, EventRecord, EventStore, QueryResult } from "@ricofritzsche/eventstore";

export type GetAllPresentationsQuery = Record<string, never>;

export type PresentationListItem = {
	presentationId: string;
	title: string;
	abstract: string;
	coverImage: string;
};

export type GetAllPresentationsQueryResponse = {
	presentations: PresentationListItem[];
};

type PresentationContextModel = PresentationListItem[];

export class GetAllPresentationsProcessor {
	constructor(private readonly eventStore: EventStore) {}

	async process(
		request: GetAllPresentationsQuery,
	): Promise<GetAllPresentationsQueryResponse> {
		this.checkPlausibility(request);

		const context = await this.loadContext();
		const contextModel = this.buildContextModel(context.events);

		return this.buildResultModel(contextModel);
	}

	private checkPlausibility(_request: GetAllPresentationsQuery): void {}

	private async loadContext(): Promise<QueryResult> {
		return this.eventStore.query(this.createPresentationSubmittedFilter());
	}

	private buildContextModel(events: EventRecord[]): PresentationContextModel {
		return events.map((event) => this.toPresentationListItem(event));
	}

	private buildResultModel(
		contextModel: PresentationContextModel,
	): GetAllPresentationsQueryResponse {
		return {
			presentations: contextModel,
		};
	}

	private createPresentationSubmittedFilter(): EventFilter {
		return {
			eventTypes: ["presentationSubmitted"],
		};
	}

	private toPresentationListItem(event: EventRecord): PresentationListItem {
		if (event.eventType !== "presentationSubmitted") {
			throw new Error(
				`Unexpected event type for get-all-presentations query: ${event.eventType}`,
			);
		}

		const presentationId = this.readRequiredString(
			event.payload.presentationId ?? event.payload.presentationSubmittedId,
			"presentationId",
		);
		const title = this.readRequiredString(event.payload.title, "title");
		const abstract = this.readRequiredString(event.payload.abstract, "abstract");
		const coverImage = this.readRequiredString(
			event.payload.coverImage,
			"coverImage",
		);

		return {
			presentationId,
			title,
			abstract,
			coverImage,
		};
	}

	private readRequiredString(value: unknown, fieldName: string): string {
		if (typeof value !== "string" || value.trim().length === 0) {
			throw new Error(
				`Expected presentationSubmitted payload field \"${fieldName}\" to be a non-empty string.`,
			);
		}

		return value;
	}
}
