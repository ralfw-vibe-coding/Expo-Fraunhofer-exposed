import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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

type LatestExpoViewModel = {
  expoCreatedId: string;
  presentationSubmissionDeadline: string;
  prefSubmissionDeadline: string;
  days: ExpoDayViewModel[];
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
    summary: "Wird danach an das Scheduling-Slice angeschlossen.",
    available: false,
  },
];

export function AppShell() {
  const [activePerspective, setActivePerspective] =
    useState<PerspectiveId>("organizer");
  const [activeOrganizerRequest, setActiveOrganizerRequest] =
    useState<OrganizerRequestId>("create-expo");

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
    | SubmitPresentationResultState;
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
