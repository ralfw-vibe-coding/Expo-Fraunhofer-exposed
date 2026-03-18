import { Fragment, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { perspectives, type PerspectiveId } from "@/lib/mock-data";
import { slicesProxy } from "@/lib/slices-proxy";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type OrganizerRequestId =
  | "create-expo"
  | "register-attendees"
  | "schedule-presentations";

type AttendeeRequestId = "submit-preferences" | "get-my-timeline";

type SlotDraft = {
  id: string;
  value: string;
};

type ExpoDayDraft = {
  id: string;
  date: string;
  numberTracks: string;
  slotLengthMin: string;
  slotStartingTimes: SlotDraft[];
};

type CreateExpoDraft = {
  presentationSubmissionDeadline: string;
  prefSubmissionDeadline: string;
  days: ExpoDayDraft[];
};

type CreateExpoResultState = {
  status: "idle" | "success" | "error";
  message: string;
  createdExpoId?: string;
};

type RegisterAttendeesResultState = {
  status: "idle" | "success" | "error";
  message: string;
  registeredCount?: number;
};

type ExpoDayViewModel = {
  dateLabel: string;
  numberTracks: number;
  slotLengthMin: number;
  slotStartingTimes: string[];
};

type AttendeeViewModel = {
  attendeeRegisteredId: string;
  attendeeId: string;
  name: string;
  email: string;
};

type AttendeeImportRow = {
  name: string;
  email: string;
};

type PresentationViewModel = {
  presentationId: string;
  title: string;
  abstract: string;
  coverImage: string;
};

type SubmitPresentationResultState = {
  status: "idle" | "success" | "error";
  message: string;
  presentationSubmittedId?: string;
};

type SubmitPreferencesResultState = {
  status: "idle" | "success" | "error";
  message: string;
  preferencesSubmittedId?: string;
};

type SchedulePresentationsResultState = {
  status: "idle" | "success" | "error";
  message: string;
  presentationsScheduledId?: string;
};

type LatestExpoViewModel = {
  expoCreatedId: string;
  presentationSubmissionDeadline: string;
  prefSubmissionDeadline: string;
  days: ExpoDayViewModel[];
};

type TimelineSessionViewModel = {
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

const organizerRequests: Array<{
  id: OrganizerRequestId;
  label: string;
  summary: string;
  available: boolean;
}> = [
  {
    id: "create-expo",
    label: "Expo anlegen",
    summary: "Rahmendaten, Deadlines und Expo-Tage erfassen.",
    available: true,
  },
  {
    id: "register-attendees",
    label: "Teilnehmer registrieren",
    summary: "CSV mit Name und E-Mail einfuegen und gesammelt registrieren.",
    available: true,
  },
  {
    id: "schedule-presentations",
    label: "Schedule generieren lassen",
    summary: "Generiert aus Expo, Einreichungen und Praeferenzen den aktuellen Plan.",
    available: true,
  },
];

const attendeeRequests: Array<{
  id: AttendeeRequestId;
  label: string;
  summary: string;
}> = [
  {
    id: "submit-preferences",
    label: "Praeferenzen einreichen",
    summary: "Vortraege auswaehlen, sortieren und an das Slice senden.",
  },
  {
    id: "get-my-timeline",
    label: "Mein Zeitplan",
    summary: "Teilnehmer auswaehlen und den persoenlichen Zeitplan anzeigen.",
  },
];

const ACTIVE_PERSPECTIVE_STORAGE_KEY = "expo-ui.active-perspective";
const ACTIVE_ORGANIZER_REQUEST_STORAGE_KEY = "expo-ui.active-organizer-request";

export function AppShell() {
  const [activePerspective, setActivePerspective] = useState<PerspectiveId>(() =>
    readStoredPerspective(),
  );
  const [activeOrganizerRequest, setActiveOrganizerRequest] =
    useState<OrganizerRequestId>(() => readStoredOrganizerRequest());

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_PERSPECTIVE_STORAGE_KEY, activePerspective);
  }, [activePerspective]);

  useEffect(() => {
    window.localStorage.setItem(
      ACTIVE_ORGANIZER_REQUEST_STORAGE_KEY,
      activeOrganizerRequest,
    );
  }, [activeOrganizerRequest]);

  const perspective = perspectives.find(
    (entry) => entry.id === activePerspective,
  ) ?? perspectives[0];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_90px_rgba(15,23,42,0.26)] sm:px-8">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.28),transparent_50%)]" />
          <div className="relative space-y-6">
            <div className="space-y-3">
              <Badge className="bg-white/12 text-white" tone="neutral">
                Expo Fraunhofer Exposed
              </Badge>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Bereich waehlen, Request starten, Expo sauber erfassen
              </h1>
              <p className="max-w-3xl text-base text-slate-300 sm:text-lg">
                Die Bereichsauswahl bleibt global. Darunter oeffnet sich pro
                Bereich eine frische Arbeitsflaeche mit horizontaler
                Request-Navigation und einem fokussierten Editor.
              </p>
            </div>

            <section className="grid gap-3 md:grid-cols-3">
              {perspectives.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setActivePerspective(entry.id)}
                  className={cn(
                    "rounded-[1.75rem] border px-5 py-4 text-left transition",
                    activePerspective === entry.id
                      ? "border-white/70 bg-white text-slate-950"
                      : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.22em] opacity-70">
                    Bereich
                  </p>
                  <p className="mt-2 text-lg font-semibold">{entry.label}</p>
                  <p className="mt-1 text-sm opacity-70">{entry.eyebrow}</p>
                </button>
              ))}
            </section>
          </div>
        </header>

        <main className="mt-6 flex-1">
          {activePerspective === "organizer" ? (
            <OrganizerArea
              activeRequest={activeOrganizerRequest}
              onSelectRequest={setActiveOrganizerRequest}
            />
          ) : activePerspective === "speaker" ? (
            <SpeakerArea />
          ) : activePerspective === "attendee" ? (
            <AttendeeArea />
          ) : (
            <AreaPlaceholder perspective={perspective} />
          )}
        </main>
      </div>
    </div>
  );
}

function OrganizerArea({
  activeRequest,
  onSelectRequest,
}: {
  activeRequest: OrganizerRequestId;
  onSelectRequest: (requestId: OrganizerRequestId) => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <div className="space-y-3 border-b border-slate-200 pb-5">
        <Badge tone="blue">Veranstaltungsorganisation</Badge>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Requests fuer die Orga</h2>
          <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
            Die Expo wird ueber einen fokussierten Editor angelegt. Weitere
            Requests bleiben schon sichtbar, kommen aber erst im naechsten Schritt.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {organizerRequests.map((request) => (
          <button
            key={request.id}
            type="button"
            onClick={() => onSelectRequest(request.id)}
            className={cn(
              "min-w-[18rem] rounded-[1.5rem] border px-4 py-4 text-left transition",
              activeRequest === request.id
                ? "border-sky-300 bg-sky-50"
                : "border-slate-200 bg-slate-50 hover:bg-white",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">{request.label}</p>
              <Badge tone={request.available ? "blue" : "neutral"}>
                {request.available ? "Live" : "Spaeter"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{request.summary}</p>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeRequest === "create-expo" ? (
          <CreateExpoWorkspace />
        ) : activeRequest === "register-attendees" ? (
          <RegisterAttendeesWorkspace />
        ) : activeRequest === "schedule-presentations" ? (
          <SchedulePresentationsWorkspace />
        ) : (
          <RequestPlaceholder requestId={activeRequest} />
        )}
      </div>
    </section>
  );
}

function SpeakerArea() {
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedPresenterKeys, setSelectedPresenterKeys] = useState<string[]>([]);
  const [attendees, setAttendees] = useState<AttendeeViewModel[]>([]);
  const [presentations, setPresentations] = useState<PresentationViewModel[]>([]);
  const [result, setResult] = useState<SubmitPresentationResultState>({
    status: "idle",
    message:
      "Noch nicht abgeschickt. Beschreibe den Vortrag und wähle rechts die Referenten aus der Teilnehmerliste.",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([
      slicesProxy.getAllAttendees(),
      slicesProxy.getAllPresentations(),
    ])
      .then(([attendeesResponse, presentationsResponse]) => {
        setAttendees(attendeesResponse.attendees);
        setPresentations(presentationsResponse.presentations);
      })
      .catch(() => undefined);
  }, []);

  const filteredAttendees = useMemo(() => {
    const normalizedFilter = filter.trim().toLowerCase();

    if (!normalizedFilter) {
      return attendees;
    }

    return attendees.filter((attendee) =>
      attendee.name.toLowerCase().includes(normalizedFilter),
    );
  }, [attendees, filter]);

  const selectedPresenters = useMemo(
    () =>
      attendees.filter((attendee) =>
        selectedPresenterKeys.includes(getAttendeeSelectionKey(attendee)),
      ),
    [attendees, selectedPresenterKeys],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const presenterIds = selectedPresenters
        .map((attendee) => getAttendeeServerId(attendee))
        .filter((value): value is string => value !== null);

      if (presenterIds.length !== selectedPresenters.length) {
        throw new Error(
          "Mindestens ein ausgewaehlter Referent hat keine gueltige Teilnehmer-ID. Bitte den Server neu starten und die Liste neu laden.",
        );
      }

      const response = await slicesProxy.submitPresentation({
        title,
        abstract,
        presenters: presenterIds,
        coverImage: buildPresentationCoverImage(title),
      });

      setResult({
        status: response.status ? "success" : "error",
        message: response.message,
        presentationSubmittedId: response.presentationSubmittedId,
      });

      if (response.status) {
        setTitle("");
        setAbstract("");
        setSelectedPresenterKeys([]);
      }

      const presentationsResponse = await slicesProxy.getAllPresentations();
      setPresentations(presentationsResponse.presentations);
    } catch (error) {
      setResult({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Der Vortrag konnte nicht eingereicht werden.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function togglePresenter(selectionKey: string) {
    setSelectedPresenterKeys((current) =>
      current.includes(selectionKey)
        ? current.filter((id) => id !== selectionKey)
        : [...current, selectionKey],
    );
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <div className="space-y-3 border-b border-slate-200 pb-5">
        <Badge tone="red">Referenten</Badge>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">
            Praesentationen einreichen
          </h2>
          <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
            Der Vortrag wird links beschrieben. Die Referenten werden aus der
            Teilnehmerliste ausgewählt und die eingereichten Vorträge rechts
            sofort sichtbar gemacht.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200 bg-white shadow-none">
          <CardHeader>
            <Badge tone="red">Eingabe-Editor</Badge>
            <CardTitle>Vortrag erfassen</CardTitle>
            <CardDescription>
              Titel, Abstract und die beteiligten Referenten in einem Schritt festlegen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <Field label="Titel">
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className={inputClassName}
                    required
                  />
                </Field>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Abstract
                  </span>
                  <textarea
                    value={abstract}
                    onChange={(event) => setAbstract(event.target.value)}
                    className={cn(textareaClassName, "min-h-[12rem]")}
                    rows={8}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="border-slate-200 bg-slate-50 shadow-none">
                  <CardHeader className="pb-3">
                    <Badge tone="neutral">Filter</Badge>
                    <CardTitle>Teilnehmerliste</CardTitle>
                    <CardDescription>
                      Nach Namen filtern und die gewünschten Referenten anhaken.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Field label="Name filtern">
                      <input
                        type="text"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        className={inputClassName}
                        placeholder="z. B. Ada"
                      />
                    </Field>

                    <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                      {filteredAttendees.length > 0 ? (
                        filteredAttendees.map((attendee) => {
                          const selectionKey = getAttendeeSelectionKey(attendee);
                          const checked = selectedPresenterKeys.includes(selectionKey);

                          return (
                            <label
                              key={selectionKey}
                              className={cn(
                                "flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition",
                                checked
                                  ? "border-rose-300 bg-rose-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePresenter(selectionKey)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-400"
                              />
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {attendee.name}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {attendee.email}
                                </p>
                              </div>
                            </label>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-600">
                          Kein Teilnehmer passt zum aktuellen Filter.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-slate-50 shadow-none">
                  <CardHeader className="pb-3">
                    <Badge tone="neutral">Auswahl</Badge>
                    <CardTitle>Ausgewaehlte Referenten</CardTitle>
                    <CardDescription>
                      Diese Personen werden an das Slice als Referenten-IDs übergeben.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPresenters.length > 0 ? (
                      selectedPresenters.map((attendee) => {
                        const presenterId = getAttendeeServerId(attendee);

                        return (
                          <div
                            key={getAttendeeSelectionKey(attendee)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-slate-900">
                              {attendee.name}
                            </p>
                            <p className="text-sm text-slate-600">
                              {attendee.email}
                            </p>
                            <p className="text-xs text-slate-500">
                              {presenterId ?? "Teilnehmer-ID fehlt"}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-600">
                        Noch keine Referenten ausgewählt.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Vortrag wird hinzugefuegt..." : "Hinzufuegen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-none">
            <CardHeader>
              <Badge tone="green">Ausgabe-Display</Badge>
              <CardTitle>Eingereichte Vortraege</CardTitle>
              <CardDescription>
                Die Liste wird nach erfolgreichem Submit sofort rechts aktualisiert.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusPanel result={result} />

              <div className="space-y-3">
                {presentations.length > 0 ? (
                  presentations.map((presentation) => (
                    <div
                      key={presentation.presentationId}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {presentation.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {presentation.abstract}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    Noch keine Präsentationen eingereicht.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function AttendeeArea() {
  const [activeRequest, setActiveRequest] =
    useState<AttendeeRequestId>("submit-preferences");

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <div className="space-y-3 border-b border-slate-200 pb-5">
        <Badge tone="green">Teilnehmer</Badge>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight">Requests fuer Teilnehmer</h2>
          <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
            Teilnehmer koennen ihre Praeferenzen abgeben oder nach Auswahl des eigenen
            Namens direkt den persoenlichen Zeitplan ansehen.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {attendeeRequests.map((request) => (
          <button
            key={request.id}
            type="button"
            onClick={() => setActiveRequest(request.id)}
            className={cn(
              "min-w-[18rem] rounded-[1.5rem] border px-4 py-4 text-left transition",
              activeRequest === request.id
                ? "border-emerald-300 bg-emerald-50"
                : "border-slate-200 bg-slate-50 hover:bg-white",
            )}
          >
            <p className="text-sm font-semibold text-slate-950">{request.label}</p>
            <p className="mt-2 text-sm text-slate-600">{request.summary}</p>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeRequest === "submit-preferences" ? (
          <SubmitPreferencesWorkspace />
        ) : (
          <TimelineWorkspace />
        )}
      </div>
    </section>
  );
}

function SubmitPreferencesWorkspace() {
  const [attendees, setAttendees] = useState<AttendeeViewModel[]>([]);
  const [presentations, setPresentations] = useState<PresentationViewModel[]>([]);
  const [attendeeFilter, setAttendeeFilter] = useState("");
  const [selectedAttendeeKey, setSelectedAttendeeKey] = useState<string | null>(null);
  const [selectedPresentationIds, setSelectedPresentationIds] = useState<string[]>([]);
  const [result, setResult] = useState<SubmitPreferencesResultState>({
    status: "idle",
    message:
      "Noch nicht abgeschickt. Wähle zuerst dich selbst aus, übernimm dann Vorträge in deine Präferenzliste und bringe sie in Reihenfolge.",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([
      slicesProxy.getAllAttendees(),
      slicesProxy.getAllPresentations(),
    ])
      .then(([attendeesResponse, presentationsResponse]) => {
        setAttendees(attendeesResponse.attendees);
        setPresentations(presentationsResponse.presentations);
      })
      .catch(() => undefined);
  }, []);

  const filteredAttendees = useMemo(() => {
    const normalizedFilter = attendeeFilter.trim().toLowerCase();

    if (!normalizedFilter) {
      return attendees;
    }

    return attendees.filter((attendee) =>
      attendee.name.toLowerCase().includes(normalizedFilter),
    );
  }, [attendees, attendeeFilter]);

  const selectedAttendee =
    attendees.find(
      (attendee) => getAttendeeSelectionKey(attendee) === selectedAttendeeKey,
    ) ?? null;

  const availablePresentations = presentations.filter(
    (presentation) => !selectedPresentationIds.includes(presentation.presentationId),
  );

  const rankedPresentations = selectedPresentationIds
    .map((presentationId) =>
      presentations.find((presentation) => presentation.presentationId === presentationId),
    )
    .filter((presentation): presentation is PresentationViewModel => presentation !== undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAttendee) {
      setResult({
        status: "error",
        message: "Bitte wähle zuerst dich selbst aus der Teilnehmerliste aus.",
      });
      return;
    }

    const attendeeId = getAttendeeServerId(selectedAttendee);

    if (!attendeeId) {
      setResult({
        status: "error",
        message:
          "Der ausgewählte Teilnehmer hat keine gültige Teilnehmer-ID. Bitte die Liste neu laden.",
      });
      return;
    }

    if (selectedPresentationIds.length === 0) {
      setResult({
        status: "error",
        message: "Bitte übernimm mindestens einen Vortrag in deine Präferenzliste.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await slicesProxy.submitPreferences({
        attendeeId,
        presentationIds: selectedPresentationIds,
      });

      setResult({
        status: response.status ? "success" : "error",
        message: response.message,
        preferencesSubmittedId: response.preferencesSubmittedId,
      });
    } catch (error) {
      setResult({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Die Präferenzen konnten nicht gespeichert werden.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function addPresentation(presentationId: string) {
    setSelectedPresentationIds((current) =>
      current.includes(presentationId) ? current : [...current, presentationId],
    );
  }

  function removePresentation(presentationId: string) {
    setSelectedPresentationIds((current) =>
      current.filter((id) => id !== presentationId),
    );
  }

  function movePresentation(presentationId: string, direction: "up" | "down") {
    setSelectedPresentationIds((current) => {
      const index = current.indexOf(presentationId);

      if (index === -1) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item as string);
      return next;
    });
  }

  return (
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200 bg-white shadow-none">
          <CardHeader>
            <Badge tone="green">Eingabe-Editor</Badge>
            <CardTitle>Präferenzliste bauen</CardTitle>
            <CardDescription>
              Links Auswahl und Ranking, rechts die aktuelle Rückmeldung an das Slice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <Card className="border-slate-200 bg-slate-50 shadow-none">
                  <CardHeader className="pb-3">
                    <Badge tone="neutral">1. Ich bin</Badge>
                    <CardTitle>Teilnehmer suchen</CardTitle>
                    <CardDescription>
                      Suche nach deinem Namen und wähle genau einen Teilnehmer aus.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Field label="Name suchen">
                      <input
                        type="text"
                        value={attendeeFilter}
                        onChange={(event) => setAttendeeFilter(event.target.value)}
                        className={inputClassName}
                        placeholder="z. B. Ada"
                      />
                    </Field>

                    <div className="max-h-[20rem] space-y-3 overflow-y-auto pr-1">
                      {filteredAttendees.length > 0 ? (
                        filteredAttendees.map((attendee) => {
                          const selectionKey = getAttendeeSelectionKey(attendee);
                          const selected = selectionKey === selectedAttendeeKey;

                          return (
                            <button
                              key={selectionKey}
                              type="button"
                              onClick={() => setSelectedAttendeeKey(selectionKey)}
                              className={cn(
                                "w-full rounded-2xl border px-4 py-3 text-left transition",
                                selected
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-slate-200 bg-white hover:bg-slate-50",
                              )}
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {attendee.name}
                              </p>
                              <p className="text-sm text-slate-600">{attendee.email}</p>
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-600">
                          Kein Teilnehmer passt zum aktuellen Filter.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-slate-50 shadow-none">
                  <CardHeader className="pb-3">
                    <Badge tone="neutral">2. Vorträge auswählen</Badge>
                    <CardTitle>Präsentationen übernehmen</CardTitle>
                    <CardDescription>
                      Übernimm nur die Vorträge, die du wirklich besuchen möchtest.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {availablePresentations.length > 0 ? (
                      availablePresentations.map((presentation) => (
                        <div
                          key={presentation.presentationId}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {presentation.title}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {presentation.abstract}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                addPresentation(presentation.presentationId)
                              }
                            >
                              Übernehmen
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">
                        Keine weiteren Präsentationen verfügbar.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-slate-200 bg-slate-50 shadow-none">
                <CardHeader className="pb-3">
                  <Badge tone="neutral">3. Ranking</Badge>
                  <CardTitle>Meine Präferenzliste</CardTitle>
                  <CardDescription>
                    Oben steht deine höchste Präferenz. Mit hoch/runter bringst du
                    die Liste in die gewünschte Reihenfolge.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rankedPresentations.length > 0 ? (
                    rankedPresentations.map((presentation, index) => (
                      <div
                        key={presentation.presentationId}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              Rang {index + 1}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {presentation.title}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {presentation.abstract}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                movePresentation(presentation.presentationId, "up")
                              }
                            >
                              Hoch
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                movePresentation(presentation.presentationId, "down")
                              }
                            >
                              Runter
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                removePresentation(presentation.presentationId)
                              }
                            >
                              Entfernen
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">
                      Noch keine Präsentationen in deiner Präferenzliste.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Präferenzen werden gespeichert..." : "Präferenzen absenden"}
                </Button>
                {selectedAttendee ? (
                  <p className="text-sm text-slate-600">
                    Ausgewählt: <span className="font-semibold text-slate-900">{selectedAttendee.name}</span>
                  </p>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-none">
            <CardHeader>
              <Badge tone="green">Ausgabe-Display</Badge>
              <CardTitle>Rückmeldung</CardTitle>
              <CardDescription>
                Zeigt die Antwort des Präferenz-Slices nach dem Absenden.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusPanel result={result} />
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Aktuelle Reihenfolge
                </p>
                <div className="mt-4 space-y-3">
                  {rankedPresentations.length > 0 ? (
                    rankedPresentations.map((presentation, index) => (
                      <div
                        key={presentation.presentationId}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {index + 1}. {presentation.title}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">
                      Noch kein Ranking aufgebaut.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}

function TimelineWorkspace() {
  const [attendees, setAttendees] = useState<AttendeeViewModel[]>([]);
  const [attendeeFilter, setAttendeeFilter] = useState("");
  const [selectedAttendeeKey, setSelectedAttendeeKey] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TimelineSessionViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void slicesProxy
      .getAllAttendees()
      .then((response) => setAttendees(response.attendees))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const filteredAttendees = useMemo(() => {
    const normalizedFilter = attendeeFilter.trim().toLowerCase();

    if (!normalizedFilter) {
      return attendees;
    }

    return attendees.filter((attendee) =>
      attendee.name.toLowerCase().includes(normalizedFilter),
    );
  }, [attendees, attendeeFilter]);

  const selectedAttendee =
    attendees.find(
      (attendee) => getAttendeeSelectionKey(attendee) === selectedAttendeeKey,
    ) ?? null;

  useEffect(() => {
    const attendeeId = selectedAttendee ? getAttendeeServerId(selectedAttendee) : null;

    if (!attendeeId) {
      setSessions([]);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    void slicesProxy
      .getMyTimeline({ attendeeId })
      .then((response) => {
        setSessions(response.sessions);
      })
      .catch((error) => {
        setSessions([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Der Zeitplan konnte nicht geladen werden.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [selectedAttendee]);

  const timelineLineOffset = useMemo(() => computeTimelineLineOffset(sessions, now), [
    sessions,
    now,
  ]);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
      <Card className="border-slate-200 bg-white shadow-none">
        <CardHeader>
          <Badge tone="green">Eingabe-Editor</Badge>
          <CardTitle>Teilnehmer auswählen</CardTitle>
          <CardDescription>
            Suche in der Teilnehmerliste und wähle genau eine Person aus, um deren
            persönlichen Zeitplan anzuzeigen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name suchen">
            <input
              type="text"
              value={attendeeFilter}
              onChange={(event) => setAttendeeFilter(event.target.value)}
              className={inputClassName}
              placeholder="z. B. Ada"
            />
          </Field>

          <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
            {filteredAttendees.length > 0 ? (
              filteredAttendees.map((attendee) => {
                const selectionKey = getAttendeeSelectionKey(attendee);
                const selected = selectionKey === selectedAttendeeKey;

                return (
                  <button
                    key={selectionKey}
                    type="button"
                    onClick={() => setSelectedAttendeeKey(selectionKey)}
                    className={cn(
                      "w-full rounded-2xl border px-4 py-3 text-left transition",
                      selected
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 hover:bg-white",
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-900">{attendee.name}</p>
                    <p className="text-sm text-slate-600">{attendee.email}</p>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-slate-600">
                Kein Teilnehmer passt zum aktuellen Filter.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-none">
        <CardHeader>
          <Badge tone="green">Ausgabe-Display</Badge>
          <CardTitle>Mein Zeitplan</CardTitle>
          <CardDescription>
            Chronologisch werden alle Präsentationen gezeigt, bei denen die gewählte
            Person Referent oder Teilnehmer ist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedAttendee ? (
            <p className="text-sm text-slate-600">
              Ausgewählt:{" "}
              <span className="font-semibold text-slate-900">{selectedAttendee.name}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Wähle links einen Teilnehmer aus, um dessen Zeitplan zu laden.
            </p>
          )}

          {errorMessage ? (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Zeitplan wird geladen...
            </div>
          ) : sessions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-[5.25rem_minmax(0,1fr)]">
              <div className="space-y-3 pt-1">
                {sessions.map((session) => (
                  <div
                    key={`${session.presentationId}-${session.startTime}`}
                    className="flex h-[92px] items-start justify-end text-sm text-slate-500"
                  >
                    {formatTimeLabel(session.startTime)}
                  </div>
                ))}
              </div>

              <div className="timeline-grid">
                {timelineLineOffset !== null ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 border-t-2 border-rose-500"
                    style={{ top: `${timelineLineOffset}px` }}
                  />
                ) : null}

                {sessions.map((session) => {
                  const toneClass = getTimelineToneClass(session, selectedAttendee, now);

                  return (
                    <div
                      key={`${session.presentationId}-${session.startTime}`}
                      className={cn("timeline-slot", toneClass)}
                    >
                      <p className="timeline-meta">
                        {formatTimeLabel(session.startTime)} / {session.roomName}
                      </p>
                      <p className="timeline-title">{session.title}</p>
                      <p className="timeline-speaker">{session.presenterName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : selectedAttendee ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Für diesen Teilnehmer liegt aktuell noch kein Zeitplan vor.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateExpoWorkspace() {
  const [draft, setDraft] = useState<CreateExpoDraft>(() => createInitialDraft());
  const [result, setResult] = useState<CreateExpoResultState>({
    status: "idle",
    message: "Noch nicht abgeschickt. Die erste Expo kann direkt aus dieser Maske erzeugt werden.",
  });
  const [latestExpo, setLatestExpo] = useState<LatestExpoViewModel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadLatestExpo()
      .then(setLatestExpo)
      .catch(() => undefined);
  }, []);

  const preview = useMemo(() => buildPreview(draft), [draft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const expoCreatedId = crypto.randomUUID();
      const response = await slicesProxy.createExpo({
        expoCreatedId,
        days: draft.days.map((day) => ({
          date: toIsoDay(day.date),
          numberTracks: Number(day.numberTracks),
          slotLengthMin: Number(day.slotLengthMin),
          slotStartingTimes: day.slotStartingTimes.map((slot) =>
            toIsoDateTime(day.date, slot.value),
          ),
        })),
        presentationSubmissionDeadline: toIsoFromLocalDateTime(
          draft.presentationSubmissionDeadline,
        ),
        prefSubmissionDeadline: toIsoFromLocalDateTime(
          draft.prefSubmissionDeadline,
        ),
      });

      setResult({
        status: response.status ? "success" : "error",
        message: response.message,
        createdExpoId: response.status ? expoCreatedId : undefined,
      });

      setLatestExpo(await loadLatestExpo());
    } catch (error) {
      setResult({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Die Expo konnte nicht angelegt werden.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateDay(dayId: string, patch: Partial<ExpoDayDraft>) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    }));
  }

  function updateSlot(dayId: string, slotId: string, value: string) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              slotStartingTimes: day.slotStartingTimes.map((slot) =>
                slot.id === slotId ? { ...slot, value } : slot,
              ),
            }
          : day,
      ),
    }));
  }

  function addDay() {
    setDraft((current) => ({
      ...current,
      days: [...current.days, createDayDraft(current.days.length + 1)],
    }));
  }

  function removeDay(dayId: string) {
    setDraft((current) => ({
      ...current,
      days:
        current.days.length === 1
          ? current.days
          : current.days.filter((day) => day.id !== dayId),
    }));
  }

  function addSlot(dayId: string) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              slotStartingTimes: [
                ...day.slotStartingTimes,
                { id: crypto.randomUUID(), value: "14:00" },
              ],
            }
          : day,
      ),
    }));
  }

  function removeSlot(dayId: string, slotId: string) {
    setDraft((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              slotStartingTimes:
                day.slotStartingTimes.length === 1
                  ? day.slotStartingTimes
                  : day.slotStartingTimes.filter((slot) => slot.id !== slotId),
            }
          : day,
      ),
    }));
  }

  function resetDraft() {
    setDraft(createInitialDraft());
    setResult({
      status: "idle",
      message: "Maske zurueckgesetzt. Du kannst eine neue Expo erfassen.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-slate-200 bg-white shadow-none">
          <CardHeader>
            <Badge tone="blue">Eingabe-Editor</Badge>
            <CardTitle>Expo anlegen</CardTitle>
            <CardDescription>
              Die Maske uebersetzt deine Eingaben direkt in das `CreateExpoCommand`.
              Die technische `expoCreatedId` wird automatisch erzeugt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <section className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-950">Deadlines</h3>
                  <p className="text-sm text-slate-600">
                    Zuerst die beiden globalen Stichtage. Die Einreichungsfrist muss
                    vor oder gleich der Praeferenzfrist liegen.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Praesentationen einreichen bis">
                    <input
                      type="datetime-local"
                      value={draft.presentationSubmissionDeadline}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          presentationSubmissionDeadline: event.target.value,
                        }))
                      }
                      className={inputClassName}
                      required
                    />
                  </Field>
                  <Field label="Praeferenzen einreichen bis">
                    <input
                      type="datetime-local"
                      value={draft.prefSubmissionDeadline}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          prefSubmissionDeadline: event.target.value,
                        }))
                      }
                      className={inputClassName}
                      required
                    />
                  </Field>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Expo-Tage</h3>
                    <p className="text-sm text-slate-600">
                      Jeder Tag enthaelt Datum, Anzahl Tracks, Slot-Laenge und die
                      Startzeiten der Slots.
                    </p>
                  </div>
                  <Button variant="outline" onClick={addDay} type="button">
                    Tag hinzufuegen
                  </Button>
                </div>

                <div className="space-y-4">
                  {draft.days.map((day, index) => (
                    <section
                      key={day.id}
                      className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Expo-Tag {index + 1}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Ein kompakter Tagesblock mit klarer Slot-Logik.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => removeDay(day.id)}
                          type="button"
                        >
                          Entfernen
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <Field label="Datum">
                          <input
                            type="date"
                            value={day.date}
                            onChange={(event) =>
                              updateDay(day.id, { date: event.target.value })
                            }
                            className={inputClassName}
                            required
                          />
                        </Field>
                        <Field label="Anzahl Tracks">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={day.numberTracks}
                            onChange={(event) =>
                              updateDay(day.id, { numberTracks: event.target.value })
                            }
                            className={inputClassName}
                            required
                          />
                        </Field>
                        <Field label="Slot-Laenge in Minuten">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={day.slotLengthMin}
                            onChange={(event) =>
                              updateDay(day.id, { slotLengthMin: event.target.value })
                            }
                            className={inputClassName}
                            required
                          />
                        </Field>
                      </div>

                      <div className="mt-4 space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              Slot-Startzeiten
                            </p>
                            <p className="text-sm text-slate-600">
                              Uhrzeiten werden mit dem Tagesdatum kombiniert.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => addSlot(day.id)}
                            type="button"
                          >
                            Zeit hinzufuegen
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {day.slotStartingTimes.map((slot, slotIndex) => (
                            <div
                              key={slot.id}
                              className="rounded-2xl border border-slate-200 bg-white p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-sm font-medium text-slate-700">
                                  Slot {slotIndex + 1}
                                </label>
                                <button
                                  type="button"
                                  className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 hover:text-slate-700"
                                  onClick={() => removeSlot(day.id, slot.id)}
                                >
                                  Entfernen
                                </button>
                              </div>
                              <input
                                type="time"
                                value={slot.value}
                                onChange={(event) =>
                                  updateSlot(day.id, slot.id, event.target.value)
                                }
                                className={cn(inputClassName, "mt-3")}
                                required
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Expo wird angelegt..." : "Expo anlegen"}
                </Button>
                <Button type="button" variant="outline" onClick={resetDraft}>
                  Maske zuruecksetzen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-none">
            <CardHeader>
              <Badge tone="green">Ausgabe-Display</Badge>
              <CardTitle>Command-Rueckmeldung</CardTitle>
              <CardDescription>
                Nach dem Submit erscheint hier die echte Processor-Antwort und die
                zuletzt gespeicherte Expo aus dem Write-through-Store.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusPanel result={result} />
              <LatestExpoPanel latestExpo={latestExpo} />
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-none">
            <CardHeader>
              <Badge tone="neutral">Live-Vorschau</Badge>
              <CardTitle>Was ausgeloest wird</CardTitle>
              <CardDescription>
                Diese Vorschau zeigt die Struktur des Commands schon vor dem Submit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Zusammenfassung
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <PreviewTile
                    title="Expo-Tage"
                    value={String(preview.numberOfDays)}
                  />
                  <PreviewTile
                    title="Gesamte Startzeiten"
                    value={String(preview.totalSlotStarts)}
                  />
                  <PreviewTile
                    title="Maximale Kapazitaet"
                    value={`${preview.totalCapacity} Sessions`}
                  />
                  <PreviewTile
                    title="Technische ID"
                    value="wird automatisch erzeugt"
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Tagesuebersicht
                </p>
                <div className="mt-4 space-y-3">
                  {preview.days.map((day, index) => (
                    <div
                      key={`${day.dateLabel}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {day.dateLabel}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {day.numberTracks} Tracks, {day.slotLengthMin} Minuten pro
                        Slot, {day.slotCount} Startzeiten
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {day.slotLabels.join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RegisterAttendeesWorkspace() {
  const [csvInput, setCsvInput] = useState(
    "name,email\nAda Lovelace,ada@example.com\nGrace Hopper;grace@example.com\nAlan Turing\talan@example.com",
  );
  const [result, setResult] = useState<RegisterAttendeesResultState>({
    status: "idle",
    message:
      "Noch nicht abgeschickt. Füge CSV-Daten ein, prüfe die Vorschau und registriere dann gesammelt.",
  });
  const [attendees, setAttendees] = useState<AttendeeViewModel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void slicesProxy
      .getAllAttendees()
      .then((response) => setAttendees(response.attendees))
      .catch(() => undefined);
  }, []);

  const parseResult = useMemo(() => parseAttendeeCsv(csvInput), [csvInput]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (parseResult.rows.length === 0) {
      setResult({
        status: "error",
        message: "Es konnten keine gueltigen Teilnehmerdaten erkannt werden.",
      });
      return;
    }

    if (parseResult.errors.length > 0) {
      setResult({
        status: "error",
        message:
          "Bitte bereinige zuerst die markierten CSV-Zeilen, bevor du den Import ausloest.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await slicesProxy.registerAttendees({
        attendees: parseResult.rows,
      });

      setResult({
        status: response.status ? "success" : "error",
        message: response.message,
        registeredCount: response.registeredCount,
      });

      const attendeesResponse = await slicesProxy.getAllAttendees();
      setAttendees(attendeesResponse.attendees);
    } catch (error) {
      setResult({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Die Teilnehmer konnten nicht registriert werden.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-none">
          <CardHeader>
            <Badge tone="blue">Eingabe-Editor</Badge>
            <CardTitle>Teilnehmer registrieren</CardTitle>
            <CardDescription>
              Erwarte eine CSV-Liste mit den Spalten `name` und `email`. Als
              Trenner funktionieren Komma, Semikolon oder TAB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <section className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-950">
                    CSV-Eingabe
                  </h3>
                  <p className="text-sm text-slate-600">
                    Erste Zeile als Header. Zum Beispiel `name,email`, `name;email`
                    oder `name[TAB]email`.
                  </p>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">
                    Teilnehmerdaten
                  </span>
                  <textarea
                    value={csvInput}
                    onChange={(event) => setCsvInput(event.target.value)}
                    className={textareaClassName}
                    rows={12}
                    spellCheck={false}
                  />
                </label>
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Teilnehmer werden registriert..."
                    : "Teilnehmer registrieren"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCsvInput(
                      "name,email\nAda Lovelace,ada@example.com\nGrace Hopper;grace@example.com\nAlan Turing\talan@example.com",
                    )
                  }
                >
                  Beispieldaten laden
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-none">
            <CardHeader>
              <Badge tone="green">Ausgabe-Display</Badge>
              <CardTitle>Import-Rueckmeldung</CardTitle>
              <CardDescription>
                Hier siehst du Parsing, Fehler und die aktuelle Teilnehmerliste.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusPanel result={result} />

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Parsing-Vorschau
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <PreviewTile
                    title="Erkannte Zeilen"
                    value={String(parseResult.rows.length)}
                  />
                  <PreviewTile
                    title="Fehler"
                    value={String(parseResult.errors.length)}
                  />
                  <PreviewTile title="Format" value={parseResult.delimiterLabel} />
                </div>
              </div>

              {parseResult.errors.length > 0 ? (
                <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-rose-600">
                    CSV-Fehler
                  </p>
                  <div className="mt-3 space-y-2">
                    {parseResult.errors.map((error) => (
                      <p key={error} className="text-sm text-rose-700">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Erkannte Datensaetze
                </p>
                <div className="mt-4 space-y-3">
                  {parseResult.rows.length > 0 ? (
                    parseResult.rows.map((row) => (
                      <div
                        key={`${row.email}-${row.name}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {row.name}
                        </p>
                        <p className="text-sm text-slate-600">{row.email}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600">
                      Noch keine gueltigen CSV-Zeilen erkannt.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-none">
            <CardHeader>
              <Badge tone="neutral">Aktueller Stand</Badge>
              <CardTitle>Bereits registrierte Teilnehmer</CardTitle>
              <CardDescription>
                Diese Liste kommt live aus dem Query `get-all-attendees`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attendees.length > 0 ? (
                attendees.map((attendee) => (
                  <div
                    key={`${attendee.email}-${attendee.name}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {attendee.name}
                    </p>
                    <p className="text-sm text-slate-600">{attendee.email}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  Noch keine Teilnehmer registriert.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SchedulePresentationsWorkspace() {
  const [attendees, setAttendees] = useState<AttendeeViewModel[]>([]);
  const [presentations, setPresentations] = useState<PresentationViewModel[]>([]);
  const [result, setResult] = useState<SchedulePresentationsResultState>({
    status: "idle",
    message:
      "Noch nicht ausgelöst. Sobald Expo, Teilnehmer, Präsentationen und Präferenzen vorliegen, kann der Schedule generiert werden.",
  });
  const [generatedSchedule, setGeneratedSchedule] = useState<{
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
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([
      slicesProxy.getAllAttendees(),
      slicesProxy.getAllPresentations(),
    ])
      .then(([attendeesResponse, presentationsResponse]) => {
        setAttendees(attendeesResponse.attendees);
        setPresentations(presentationsResponse.presentations);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void slicesProxy
      .getLatestSchedule()
      .then((response) => {
        if (!response.schedule) {
          return;
        }

        setGeneratedSchedule(normalizeScheduleSnapshot(response.schedule.schedule));
        setResult({
          status: "success",
          message: "Ein bereits gespeicherter Schedule wurde geladen.",
          presentationsScheduledId: response.schedule.presentationsScheduledId,
        });
      })
      .catch(() => undefined);
  }, []);

  async function handleGenerate() {
    setIsSubmitting(true);

    try {
      const response = await slicesProxy.schedulePresentations();

      setResult({
        status: response.status ? "success" : "error",
        message: response.message,
        presentationsScheduledId: response.status
          ? response.presentationsScheduledId
          : undefined,
      });

      setGeneratedSchedule(
        response.status
          ? normalizeScheduleSnapshot(response.schedule)
          : null,
      );
    } catch (error) {
      setResult({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Der Schedule konnte nicht generiert werden.",
      });
      setGeneratedSchedule(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  const slotCount = generatedSchedule?.slots.length ?? 0;
  const trackCount =
    generatedSchedule?.slots.reduce((sum, slot) => sum + slot.tracks.length, 0) ?? 0;
  const attendeeAssignments =
    generatedSchedule?.slots.reduce(
      (sum, slot) =>
        sum +
        slot.tracks.reduce((trackSum, track) => trackSum + track.attendees.length, 0),
      0,
    ) ?? 0;
  const trackNames = useMemo(() => {
    const names: string[] = [];

    for (const slot of generatedSchedule?.slots ?? []) {
      for (const track of slot.tracks) {
        if (!names.includes(track.roomName)) {
          names.push(track.roomName);
        }
      }
    }

    return names;
  }, [generatedSchedule]);

  const attendeeNameById = useMemo(
    () =>
      new Map(
        attendees.map((attendee) => [
          getAttendeeServerId(attendee) ?? attendee.attendeeRegisteredId,
          attendee.name,
        ]),
      ),
    [attendees],
  );
  const presentationById = useMemo(
    () => new Map(presentations.map((presentation) => [presentation.presentationId, presentation])),
    [presentations],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-none">
          <CardHeader>
            <Badge tone="blue">Eingabe-Editor</Badge>
            <CardTitle>Schedule generieren lassen</CardTitle>
            <CardDescription>
              Dieser Request braucht keine weiteren Eingaben. Der Server nimmt den
              aktuellen Expo-Kontext und erzeugt daraus den Schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-lg font-semibold text-slate-950">Planung auslösen</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Der Button ruft das Scheduling-Slice auf. Dabei werden Expo, registrierte
                Teilnehmer, eingereichte Präsentationen, Referenten-Zuordnungen und
                gespeicherte Präferenzen gemeinsam ausgewertet.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button size="lg" type="button" onClick={handleGenerate} disabled={isSubmitting}>
                  {isSubmitting
                    ? "Schedule wird generiert..."
                    : "Schedule generieren lassen"}
                </Button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Hinweis
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Wenn noch notwendige Eingangsdaten fehlen oder Konflikte nicht auflösbar
                sind, meldet das Slice den Grund direkt zurück.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-slate-200 bg-white shadow-none">
            <CardHeader>
              <Badge tone="green">Ausgabe-Display</Badge>
              <CardTitle>Scheduling-Rueckmeldung</CardTitle>
              <CardDescription>
                Zeigt die Antwort des Scheduling-Processors und die letzte erzeugte
                Planungszusammenfassung.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusPanel result={result} />

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Zusammenfassung
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <PreviewTile title="Zeitslots" value={String(slotCount)} />
                  <PreviewTile title="Tracks" value={String(trackCount)} />
                  <PreviewTile
                    title="Zuordnungen"
                    value={String(attendeeAssignments)}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Letzter generierter Schedule
                </p>
                <div className="mt-4 space-y-3">
                  {generatedSchedule && generatedSchedule.slots.length > 0 ? (
                    <p className="text-sm text-slate-600">
                      Unten wird das Expo-Programm als Matrix aus Zeit und Tracks dargestellt.
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">
                      Noch kein Schedule generiert.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-none">
        <CardHeader>
          <Badge tone="neutral">Expo-Programm</Badge>
          <CardTitle>Letzter generierter Schedule als Matrix</CardTitle>
          <CardDescription>
            Zeit verläuft vertikal links, Tracks liegen horizontal als Spalten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generatedSchedule && generatedSchedule.slots.length > 0 && trackNames.length > 0 ? (
            <div className="overflow-x-auto">
              <div
                className="schedule-matrix"
                style={{
                  gridTemplateColumns: `5.5rem repeat(${trackNames.length}, minmax(16rem, 1fr))`,
                }}
              >
                <div className="schedule-matrix-corner" />
                {trackNames.map((trackName) => (
                  <div key={trackName} className="schedule-matrix-header">
                    {trackName}
                  </div>
                ))}

                {generatedSchedule.slots.map((slot) => {
                  const tracksByRoom = new Map(
                    slot.tracks.map((track) => [track.roomName, track]),
                  );

                  return (
                    <Fragment key={`${slot.from}-${slot.until}`}>
                      <div className="schedule-matrix-time">
                        {formatTimeLabel(slot.from)}
                      </div>
                      {trackNames.map((trackName) => {
                        const track = tracksByRoom.get(trackName);
                        if (!track) {
                          return (
                            <div key={`${slot.from}-${trackName}`} className="schedule-matrix-cell-empty">
                              Frei
                            </div>
                          );
                        }

                        const presentation =
                          presentationById.get(track.presentation)?.title ?? track.presentation;
                        const presenter =
                          attendeeNameById.get(track.presenter) ?? track.presenter;
                        const attendeeList =
                          track.attendees
                            .map((attendeeId) => attendeeNameById.get(attendeeId) ?? attendeeId)
                            .join(", ") || "Keine Teilnehmer";

                        return (
                          <div
                            key={`${slot.from}-${trackName}-${track.presentation}`}
                            className="schedule-matrix-cell"
                          >
                            <p className="schedule-matrix-title">{presentation}</p>
                            <p className="schedule-matrix-line">
                              Referent: {presenter}
                            </p>
                            <p className="schedule-matrix-line">
                              Teilnehmer: {attendeeList}
                            </p>
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Noch kein Schedule generiert.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function StatusPanel({
  result,
}: {
  result:
    | CreateExpoResultState
    | RegisterAttendeesResultState
    | SubmitPresentationResultState
    | SubmitPreferencesResultState
    | SchedulePresentationsResultState;
}) {
  const tone =
    result.status === "success"
      ? "border-emerald-200 bg-emerald-50"
      : result.status === "error"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-slate-50";

  return (
    <div className={cn("rounded-[1.5rem] border p-4", tone)}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Processor</p>
      <p className="mt-3 text-sm font-semibold text-slate-950">{result.message}</p>
      {"createdExpoId" in result && result.createdExpoId ? (
        <p className="mt-2 text-xs text-slate-500">
          Angelegte `expoCreatedId`: {result.createdExpoId}
        </p>
      ) : null}
      {"registeredCount" in result && result.registeredCount !== undefined ? (
        <p className="mt-2 text-xs text-slate-500">
          Registrierte Teilnehmer in diesem Import: {result.registeredCount}
        </p>
      ) : null}
      {"presentationSubmittedId" in result && result.presentationSubmittedId ? (
        <p className="mt-2 text-xs text-slate-500">
          Eingereichte `presentationSubmittedId`: {result.presentationSubmittedId}
        </p>
      ) : null}
      {"preferencesSubmittedId" in result && result.preferencesSubmittedId ? (
        <p className="mt-2 text-xs text-slate-500">
          Gespeicherte `preferencesSubmittedId`: {result.preferencesSubmittedId}
        </p>
      ) : null}
      {"presentationsScheduledId" in result && result.presentationsScheduledId ? (
        <p className="mt-2 text-xs text-slate-500">
          Gespeicherte `presentationsScheduledId`: {result.presentationsScheduledId}
        </p>
      ) : null}
    </div>
  );
}

function LatestExpoPanel({ latestExpo }: { latestExpo: LatestExpoViewModel | null }) {
  if (!latestExpo) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Letzte gespeicherte Expo
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Noch keine Expo im lokalen Write-through-Store vorhanden.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        Letzte gespeicherte Expo
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {latestExpo.expoCreatedId}
          </p>
          <p className="text-sm text-slate-600">
            Abstract bis {latestExpo.presentationSubmissionDeadline}
          </p>
          <p className="text-sm text-slate-600">
            Praeferenzen bis {latestExpo.prefSubmissionDeadline}
          </p>
        </div>

        <div className="space-y-2">
          {latestExpo.days.map((day, index) => (
            <div
              key={`${day.dateLabel}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
            >
              <p className="text-sm font-semibold text-slate-900">{day.dateLabel}</p>
              <p className="text-sm text-slate-600">
                {day.numberTracks} Tracks, {day.slotLengthMin} Minuten
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {day.slotStartingTimes.join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewTile({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function RequestPlaceholder({ requestId }: { requestId: OrganizerRequestId }) {
  const label = organizerRequests.find((request) => request.id === requestId)?.label;

  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardHeader>
        <Badge tone="neutral">Request in Vorbereitung</Badge>
        <CardTitle>{label}</CardTitle>
        <CardDescription>
          Dieser Request kommt als naechstes in dieselbe Editor/Display-Struktur.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">
        Im Moment ist nur `Expo anlegen` wirklich umgesetzt und bereits an das
        Slice angebunden.
      </CardContent>
    </Card>
  );
}

function AreaPlaceholder({
  perspective,
}: {
  perspective: (typeof perspectives)[number];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-10 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <Badge
        tone={
          perspective.accent === "blue"
            ? "blue"
            : perspective.accent === "green"
              ? "green"
              : "red"
        }
      >
        Bereich
      </Badge>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">
        {perspective.label}
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
        Dieser Bereich folgt nach der Veranstalter-Strecke. Der neue Rahmen steht
        aber schon: horizontale Request-Auswahl und darunter eine fokussierte
        Arbeitsflaeche.
      </p>
    </section>
  );
}

function createInitialDraft(): CreateExpoDraft {
  return {
    presentationSubmissionDeadline: "2026-04-01T12:00",
    prefSubmissionDeadline: "2026-04-05T12:00",
    days: [createDayDraft(1)],
  };
}

function createDayDraft(index: number): ExpoDayDraft {
  const date = `2026-04-${String(14 + index).padStart(2, "0")}`;

  return {
    id: crypto.randomUUID(),
    date,
    numberTracks: index === 1 ? "3" : "2",
    slotLengthMin: "45",
    slotStartingTimes: [
      { id: crypto.randomUUID(), value: "09:00" },
      { id: crypto.randomUUID(), value: "10:15" },
      { id: crypto.randomUUID(), value: "11:30" },
    ],
  };
}

function buildPreview(draft: CreateExpoDraft) {
  const days = draft.days.map((day) => {
    const slotCount = day.slotStartingTimes.length;
    const numberTracks = Number(day.numberTracks) || 0;
    const slotLengthMin = Number(day.slotLengthMin) || 0;

    return {
      dateLabel: formatDate(day.date),
      numberTracks,
      slotLengthMin,
      slotCount,
      slotLabels: day.slotStartingTimes
        .map((slot) => slot.value)
        .filter(Boolean)
        .sort(),
    };
  });

  const totalSlotStarts = draft.days.reduce(
    (sum, day) => sum + day.slotStartingTimes.length,
    0,
  );
  const totalCapacity = draft.days.reduce((sum, day) => {
    const numberTracks = Number(day.numberTracks) || 0;
    return sum + numberTracks * day.slotStartingTimes.length;
  }, 0);

  return {
    numberOfDays: draft.days.length,
    totalSlotStarts,
    totalCapacity,
    days,
  };
}

async function loadLatestExpo(): Promise<LatestExpoViewModel | null> {
  const response = await slicesProxy.getLatestExpo();

  if (!response.expo) {
    return null;
  }

  return {
    expoCreatedId: response.expo.expoCreatedId || "unbekannt",
    presentationSubmissionDeadline: formatDateTime(
      response.expo.presentationSubmissionDeadline,
    ),
    prefSubmissionDeadline: formatDateTime(response.expo.prefSubmissionDeadline),
    days: response.expo.days.map((day) => ({
      dateLabel: formatDate(day.date),
      numberTracks: day.numberTracks,
      slotLengthMin: day.slotLengthMin,
      slotStartingTimes: day.slotStartingTimes.map(formatTimeOnly),
    })),
  };
}

function toIsoFromLocalDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function toIsoDateTime(date: string, time: string) {
  const rawValue = `${date}T${time}:00`;
  const parsed = new Date(rawValue);

  return Number.isNaN(parsed.getTime()) ? rawValue : parsed.toISOString();
}

function toIsoDay(value: string) {
  const rawValue = `${value}T00:00:00.000Z`;
  const parsed = new Date(rawValue);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Datum unvollstaendig";
  }

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Zeitpunkt unvollstaendig";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTimeOnly(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const inputClassName =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

const textareaClassName =
  "min-h-[16rem] w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

function parseAttendeeCsv(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      rows: [] as AttendeeImportRow[],
      errors: [] as string[],
      delimiterLabel: "noch leer",
    };
  }

  const delimiter = detectDelimiter(lines[0] ?? "");
  const delimiterLabel =
    delimiter === ","
      ? "Komma"
      : delimiter === ";"
        ? "Semikolon"
        : delimiter === "\t"
          ? "TAB"
          : "Komma";

  const header = splitCsvLine(lines[0] ?? "", delimiter).map((value) =>
    value.trim().toLowerCase(),
  );
  const nameIndex = header.indexOf("name");
  const emailIndex = header.indexOf("email");
  const rows: AttendeeImportRow[] = [];
  const errors: string[] = [];

  if (nameIndex === -1 || emailIndex === -1) {
    return {
      rows,
      errors: [
        "Header nicht erkannt. Die erste Zeile muss die Spalten `name` und `email` enthalten.",
      ],
      delimiterLabel,
    };
  }

  lines.slice(1).forEach((line, index) => {
    const columns = splitCsvLine(line, delimiter);
    const name = columns[nameIndex]?.trim() ?? "";
    const email = columns[emailIndex]?.trim() ?? "";
    const lineNumber = index + 2;

    if (!name || !email) {
      errors.push(`Zeile ${lineNumber}: Name und E-Mail muessen gefuellt sein.`);
      return;
    }

    if (!email.includes("@")) {
      errors.push(`Zeile ${lineNumber}: "${email}" ist keine gueltige E-Mail.`);
      return;
    }

    rows.push({ name, email });
  });

  return {
    rows,
    errors,
    delimiterLabel,
  };
}

function detectDelimiter(line: string) {
  const delimiters = [",", ";", "\t"] as const;

  return (
    delimiters
      .map((delimiter) => ({
        delimiter,
        count: line.split(delimiter).length,
      }))
      .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ","
  );
}

function splitCsvLine(line: string, delimiter: string) {
  return line.split(delimiter);
}

function getAttendeeSelectionKey(attendee: AttendeeViewModel) {
  return getAttendeeServerId(attendee) ?? attendee.email;
}

function getAttendeeServerId(attendee: AttendeeViewModel): string | null {
  if (typeof attendee.attendeeId === "string" && attendee.attendeeId.trim().length > 0) {
    return attendee.attendeeId;
  }

  return typeof attendee.attendeeRegisteredId === "string" &&
    attendee.attendeeRegisteredId.trim().length > 0
    ? attendee.attendeeRegisteredId
    : null;
}

function buildPresentationCoverImage(title: string) {
  const safeTitle = title.trim() || "Expo Talk";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0f172a"/><rect x="42" y="42" width="1116" height="546" rx="28" fill="#f8fafc"/><text x="96" y="220" fill="#0f172a" font-family="IBM Plex Sans, sans-serif" font-size="42">Expo Fraunhofer Exposed</text><text x="96" y="320" fill="#be123c" font-family="IBM Plex Sans, sans-serif" font-size="68" font-weight="700">${escapeXml(
    safeTitle,
  )}</text><text x="96" y="400" fill="#475569" font-family="IBM Plex Sans, sans-serif" font-size="30">Speaker submission generated by UI</text></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatDateTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTimelineToneClass(
  session: TimelineSessionViewModel,
  selectedAttendee: AttendeeViewModel | null,
  now: Date,
) {
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  const attendeeId = selectedAttendee ? getAttendeeServerId(selectedAttendee) : null;

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "timeline-slot-future";
  }

  if (end.getTime() <= now.getTime()) {
    return "timeline-slot-past";
  }

  if (attendeeId && session.presenterId === attendeeId) {
    return "timeline-slot-speaker";
  }

  if (start.getTime() <= now.getTime() && end.getTime() > now.getTime()) {
    return "timeline-slot-current";
  }

  return "timeline-slot-future";
}

function computeTimelineLineOffset(
  sessions: TimelineSessionViewModel[],
  now: Date,
): number | null {
  if (sessions.length === 0) {
    return null;
  }

  const slotHeight = 92;
  const slotGap = 12;

  for (const [index, session] of sessions.entries()) {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      now.getTime() < start.getTime() ||
      now.getTime() > end.getTime()
    ) {
      continue;
    }

    const duration = end.getTime() - start.getTime();
    if (duration <= 0) {
      return index * (slotHeight + slotGap);
    }

    const progress = (now.getTime() - start.getTime()) / duration;
    return index * (slotHeight + slotGap) + progress * slotHeight;
  }

  return null;
}

function normalizeScheduleSnapshot(schedule: {
  slots: Array<{
    from: string | Date;
    until: string | Date;
    tracks: Array<{
      roomName: string;
      presentation: string;
      presenter: string;
      attendees: string[];
    }>;
  }>;
}) {
  return {
    slots: schedule.slots.map((slot) => ({
      from:
        slot.from instanceof Date ? slot.from.toISOString() : String(slot.from),
      until:
        slot.until instanceof Date ? slot.until.toISOString() : String(slot.until),
      tracks: slot.tracks.map((track) => ({
        roomName: track.roomName,
        presentation: track.presentation,
        presenter: track.presenter,
        attendees: [...track.attendees],
      })),
    })),
  };
}

function readStoredPerspective(): PerspectiveId {
  if (typeof window === "undefined") {
    return "organizer";
  }

  const value = window.localStorage.getItem(ACTIVE_PERSPECTIVE_STORAGE_KEY);
  return perspectives.some((entry) => entry.id === value)
    ? (value as PerspectiveId)
    : "organizer";
}

function readStoredOrganizerRequest(): OrganizerRequestId {
  if (typeof window === "undefined") {
    return "create-expo";
  }

  const value = window.localStorage.getItem(ACTIVE_ORGANIZER_REQUEST_STORAGE_KEY);
  return organizerRequests.some((request) => request.id === value)
    ? (value as OrganizerRequestId)
    : "create-expo";
}
