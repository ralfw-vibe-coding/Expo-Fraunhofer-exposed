import { mkdir } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MemoryEventStore } from "@ricofritzsche/eventstore";

import {
  CreateExpoProcessor,
  EXPO_CREATED_EVENT_TYPE,
  type CreateExpoCommand,
} from "../slices/create-expo/createExpoProcessor";
import {
  GetAllAttendeesProcessor,
  type GetAllAttendeesQuery,
} from "../slices/get-all-attendees/getAllAttendeesProcessor";
import {
  GetAllPresentationsProcessor,
  type GetAllPresentationsQuery,
} from "../slices/get-all-presentations/getAllPresentationsProcessor";
import {
  GetMyTimelineQueryProcessor,
  type GetMyTimelineQuery,
} from "../slices/get-my-timeline/getMyTimelineProcessor";
import {
  RegisterAttendeesCommandProcessor,
  type RegisterAttendeesCommand,
} from "../slices/register-attendees/registerAttendeesProcessor";
import {
  SchedulePresentationsProcessor,
  PRESENTATIONS_SCHEDULED_EVENT_TYPE,
  type SchedulePresentationsCommand,
} from "../slices/schedule-presentations/schedulePresentationsProcessor";
import {
  SubmitPreferencesProcessor,
  type SubmitPreferencesCommand,
} from "../slices/submit-preferences/submitPreferencesProcessor";
import {
  SubmitPresentationProcessor,
  type SubmitPresentationCommand,
} from "../slices/submit-presentation/submitPresentationProcessor";

type ExpoSnapshot = {
  expoCreatedId: string;
  presentationSubmissionDeadline: string;
  prefSubmissionDeadline: string;
  days: Array<{
    date: string;
    numberTracks: number;
    slotLengthMin: number;
    slotStartingTimes: string[];
  }>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");
const dataDir = path.join(workspaceRoot, "data");
const eventStoreFile = path.join(dataDir, "eventstore.json");
const port = Number(process.env.PORT ?? 3001);

const eventStorePromise = initializeEventStore();

const server = http.createServer(async (request, response) => {
  try {
    if (!request.url || !request.method) {
      sendJson(response, 400, { message: "Invalid request." });
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/slices/create-expo") {
      const payload = await readJson<CreateExpoCommand>(request);
      const processor = new CreateExpoProcessor(await eventStorePromise);
      sendJson(response, 200, await processor.process(payload));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/slices/create-expo/latest") {
      sendJson(response, 200, { expo: await loadLatestExpoSnapshot() });
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/slices/register-attendees"
    ) {
      const payload = await readJson<RegisterAttendeesCommand>(request);
      const processor = new RegisterAttendeesCommandProcessor(await eventStorePromise);
      sendJson(response, 200, await processor.process(payload));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/slices/get-all-attendees") {
      const processor = new GetAllAttendeesProcessor(await eventStorePromise);
      const query: GetAllAttendeesQuery = {};
      sendJson(response, 200, await processor.process(query));
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/slices/get-all-presentations"
    ) {
      const processor = new GetAllPresentationsProcessor(await eventStorePromise);
      const query: GetAllPresentationsQuery = {};
      sendJson(response, 200, await processor.process(query));
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/slices/submit-presentation"
    ) {
      const payload = await readJson<SubmitPresentationCommand>(request);
      const processor = new SubmitPresentationProcessor(await eventStorePromise);
      sendJson(response, 200, await processor.process(payload));
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/slices/submit-preferences"
    ) {
      const payload = await readJson<SubmitPreferencesCommand>(request);
      const processor = new SubmitPreferencesProcessor(await eventStorePromise);
      sendJson(response, 200, await processor.process(payload));
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/slices/schedule-presentations"
    ) {
      const payload = await readJson<SchedulePresentationsCommand>(request);
      const processor = new SchedulePresentationsProcessor(await eventStorePromise);
      sendJson(response, 200, await processor.process(payload));
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/api/slices/schedule-presentations/latest"
    ) {
      sendJson(response, 200, { schedule: await loadLatestScheduleSnapshot() });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/slices/get-my-timeline") {
      const attendeeId = url.searchParams.get("attendeeId") ?? "";
      const processor = new GetMyTimelineQueryProcessor(await eventStorePromise);
      const query: GetMyTimelineQuery = { attendeeId };
      sendJson(response, 200, await processor.process(query));
      return;
    }

    sendJson(response, 404, { message: "Route not found." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    sendJson(response, 500, { message });
  }
});

server.listen(port, () => {
  console.log(`Slice server listening on http://127.0.0.1:${port}`);
});

async function initializeEventStore() {
  await mkdir(dataDir, { recursive: true });
  return MemoryEventStore.createFromFile(eventStoreFile, true, true);
}

async function readJson<T>(request: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function sendJson(
  response: http.ServerResponse,
  statusCode: number,
  payload: unknown,
) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

async function loadLatestExpoSnapshot(): Promise<ExpoSnapshot | null> {
  const eventStore = await eventStorePromise;
  const result = await eventStore.query();
  const latestExpoEvent = [...result.events]
    .reverse()
    .find((event) => event.eventType === EXPO_CREATED_EVENT_TYPE);

  if (!latestExpoEvent) {
    return null;
  }

  const payload = latestExpoEvent.payload as {
    expoCreatedId?: string;
    presentationSubmissionDeadline?: string;
    prefSubmissionDeadline?: string;
    days?: ExpoSnapshot["days"];
  };

  return {
    expoCreatedId: payload.expoCreatedId ?? "",
    presentationSubmissionDeadline: payload.presentationSubmissionDeadline ?? "",
    prefSubmissionDeadline: payload.prefSubmissionDeadline ?? "",
    days: payload.days ?? [],
  };
}

async function loadLatestScheduleSnapshot(): Promise<{
  presentationsScheduledId: string;
  schedule: {
    slots: Array<{
      from: string;
      until: string;
      tracks: Array<{
        roomName: string;
        presentation: string;
        presenter: string;
        attendees: string[];
      }>;
    }>;
  };
} | null> {
  const eventStore = await eventStorePromise;
  const result = await eventStore.query();
  const latestScheduleEvent = [...result.events]
    .reverse()
    .find((event) => event.eventType === PRESENTATIONS_SCHEDULED_EVENT_TYPE);

  if (!latestScheduleEvent) {
    return null;
  }

  const payload = latestScheduleEvent.payload as {
    presentationsScheduledId?: string;
    schedule?: {
      slots?: Array<{
        from?: string;
        until?: string;
        tracks?: Array<{
          roomName?: string;
          presentation?: string;
          presenter?: string;
          attendees?: string[];
        }>;
      }>;
    };
  };

  return {
    presentationsScheduledId: payload.presentationsScheduledId ?? "",
    schedule: {
      slots:
        payload.schedule?.slots?.map((slot) => ({
          from: slot.from ?? "",
          until: slot.until ?? "",
          tracks:
            slot.tracks?.map((track) => ({
              roomName: track.roomName ?? "",
              presentation: track.presentation ?? "",
              presenter: track.presenter ?? "",
              attendees: Array.isArray(track.attendees) ? track.attendees : [],
            })) ?? [],
        })) ?? [],
    },
  };
}
