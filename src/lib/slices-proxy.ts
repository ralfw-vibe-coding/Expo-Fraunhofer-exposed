import type {
  CreateExpoCommand,
  CreateExpoCommandResponse,
} from "../../slices/create-expo/createExpoProcessor";
import type {
  GetAllAttendeesQuery,
  GetAllAttendeesResponse,
} from "../../slices/get-all-attendees/getAllAttendeesProcessor";
import type {
  GetAllPresentationsQuery,
  GetAllPresentationsQueryResponse,
} from "../../slices/get-all-presentations/getAllPresentationsProcessor";
import type {
  GetMyTimelineQuery,
  GetMyTimelineQueryResponse,
} from "../../slices/get-my-timeline/getMyTimelineProcessor";
import type {
  RegisterAttendeesCommand,
  RegisterAttendeesCommandResponse,
} from "../../slices/register-attendees/registerAttendeesProcessor";
import type {
  SchedulePresentationsCommand,
  SchedulePresentationsCommandResponse,
} from "../../slices/schedule-presentations/schedulePresentationsProcessor";
import type {
  SubmitPreferencesCommand,
  SubmitPreferencesCommandResponse,
} from "../../slices/submit-preferences/submitPreferencesProcessor";
import type {
  SubmitPresentationCommand,
  SubmitPresentationResponse,
} from "../../slices/submit-presentation/submitPresentationProcessor";

export type LatestExpoResponse = {
  expo: {
    expoCreatedId: string;
    presentationSubmissionDeadline: string;
    prefSubmissionDeadline: string;
    days: Array<{
      date: string;
      numberTracks: number;
      slotLengthMin: number;
      slotStartingTimes: string[];
    }>;
  } | null;
};

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(errorPayload?.message ?? `Request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

export const slicesProxy = {
  createExpo(command: CreateExpoCommand) {
    return fetchJson<CreateExpoCommandResponse>("/api/slices/create-expo", {
      method: "POST",
      body: JSON.stringify(command),
    });
  },

  getLatestExpo() {
    return fetchJson<LatestExpoResponse>("/api/slices/create-expo/latest");
  },

  registerAttendees(command: RegisterAttendeesCommand) {
    return fetchJson<RegisterAttendeesCommandResponse>(
      "/api/slices/register-attendees",
      {
        method: "POST",
        body: JSON.stringify(command),
      },
    );
  },

  getAllAttendees(_query: GetAllAttendeesQuery = {}) {
    return fetchJson<GetAllAttendeesResponse>("/api/slices/get-all-attendees");
  },

  getAllPresentations(_query: GetAllPresentationsQuery = {}) {
    return fetchJson<GetAllPresentationsQueryResponse>(
      "/api/slices/get-all-presentations",
    );
  },

  submitPresentation(command: SubmitPresentationCommand) {
    return fetchJson<SubmitPresentationResponse>("/api/slices/submit-presentation", {
      method: "POST",
      body: JSON.stringify(command),
    });
  },

  submitPreferences(command: SubmitPreferencesCommand) {
    return fetchJson<SubmitPreferencesCommandResponse>(
      "/api/slices/submit-preferences",
      {
        method: "POST",
        body: JSON.stringify(command),
      },
    );
  },

  schedulePresentations(command: SchedulePresentationsCommand = {}) {
    return fetchJson<SchedulePresentationsCommandResponse>(
      "/api/slices/schedule-presentations",
      {
        method: "POST",
        body: JSON.stringify(command),
      },
    );
  },

  getMyTimeline(query: GetMyTimelineQuery) {
    const params = new URLSearchParams({ attendeeId: query.attendeeId });
    return fetchJson<GetMyTimelineQueryResponse>(
      `/api/slices/get-my-timeline?${params.toString()}`,
    );
  },
};
