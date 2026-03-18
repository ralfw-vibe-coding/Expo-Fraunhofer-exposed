import { useEffect, useMemo, useState } from "react";

import {
  organizerAutoPanels,
  perspectives,
  timelineItems,
  type PerspectiveId,
  type TimelineItem,
} from "@/lib/mock-data";
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

type TimelineState = {
  now: Date;
};

const perspectiveSurface: Record<PerspectiveId, string> = {
  organizer:
    "from-sky-100 via-white to-cyan-50 ring-sky-200/70 before:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_45%)]",
  speaker:
    "from-rose-100 via-white to-orange-50 ring-rose-200/70 before:bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.12),transparent_45%)]",
  attendee:
    "from-emerald-100 via-white to-lime-50 ring-emerald-200/70 before:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_45%)]",
};

const organizerRequestDescriptions: Record<string, string> = {
  "create-expo":
    "Startet den Setup-Prozess der Expo mit den zentralen Rahmendaten fuer Tage, Tracks und Deadlines.",
  "register-attendees":
    "Erfasst Personen gesammelt, damit sie spaeter in Listen, Praeferenzen und Planungen auftauchen.",
  "schedule-presentations":
    "Loest die automatische Generierung des Vortragsplans aus, sobald genug Daten vorliegen.",
};

export function AppShell() {
  const [activePerspective, setActivePerspective] =
    useState<PerspectiveId>("organizer");
  const [activeOrganizerRequest, setActiveOrganizerRequest] = useState("create-expo");
  const [timelineState, setTimelineState] = useState<TimelineState>({
    now: new Date("2026-03-18T11:45:00+01:00"),
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimelineState((current) => ({
        now: new Date(current.now.getTime() + 60_000),
      }));
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const perspective = perspectives.find(
    (entry) => entry.id === activePerspective,
  ) ?? perspectives[0];
  const organizerRequests = perspectives.find(
    (entry) => entry.id === "organizer",
  )?.commandCards ?? [];
  const selectedOrganizerRequest =
    organizerRequests.find((request) => request.id === activeOrganizerRequest) ??
    organizerRequests[0];

  const timelineModel = useMemo(
    () =>
      buildTimelineModel({
        items: timelineItems,
        now: timelineState.now,
      }),
    [timelineState.now],
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_90px_rgba(15,23,42,0.26)] sm:px-8">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.28),transparent_50%)]" />
          <div className="relative space-y-6">
            <div className="space-y-3">
              <Badge className="bg-white/12 text-white" tone="neutral">
                Expo Fraunhofer Exposed
              </Badge>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Klick-Dummy fuer Bereich, Request, Eingabe und Ausgabe
              </h1>
              <p className="max-w-3xl text-base text-slate-300 sm:text-lg">
                Oben wird der Bereich gewaehlt. Darunter oeffnet sich pro Bereich
                die passende Arbeitsflaeche mit expliziten Requests und dauerhaft
                sichtbaren Informationspanels.
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

        <main className="mt-6 grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section
            className={cn(
              "relative overflow-hidden rounded-[2rem] ring-1 before:absolute before:inset-0 before:opacity-100 before:content-['']",
              "bg-gradient-to-br p-1",
              perspectiveSurface[perspective.id],
            )}
          >
            <div className="relative h-full rounded-[1.75rem] bg-white/84 p-5 backdrop-blur sm:p-6">
              {activePerspective === "organizer" && selectedOrganizerRequest ? (
                <OrganizerWorkspace
                  activeRequestId={activeOrganizerRequest}
                  onSelectRequest={setActiveOrganizerRequest}
                />
              ) : (
                <RolePlaceholder perspective={perspective} />
              )}
            </div>
          </section>

          <aside className="grid gap-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <Badge tone="red">Timeline View Model</Badge>
                <CardTitle>Mein Zeitplan</CardTitle>
                <CardDescription>
                  Die Timeline bleibt als Referenz fuer den spaeteren Teilnehmer-Query sichtbar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimelinePreview model={timelineModel} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informationslogik fuer Veranstalter</CardTitle>
                <CardDescription>
                  Diese beiden Displays laufen spaeter automatisch mit und muessen
                  nicht extra angestossen werden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Teilnehmer listen:</span>{" "}
                  wird fortlaufend angezeigt und nach Commands sofort aktualisiert.
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Praesentationen listen:</span>{" "}
                  bleibt ebenfalls immer sichtbar, damit die Orga den Stand des
                  Programms parallel im Blick hat.
                </p>
              </CardContent>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
}

function OrganizerWorkspace({
  activeRequestId,
  onSelectRequest,
}: {
  activeRequestId: string;
  onSelectRequest: (requestId: string) => void;
}) {
  const organizer = perspectives.find((entry) => entry.id === "organizer");
  const requests = organizer?.commandCards ?? [];
  const activeRequest =
    requests.find((request) => request.id === activeRequestId) ?? requests[0];

  if (!organizer || !activeRequest) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-2">
          <Badge tone="blue">{organizer.eyebrow}</Badge>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {organizer.label}
            </h2>
            <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
              {organizer.intro}
            </p>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.95fr_1.25fr]">
          <Card className="border-slate-200 bg-white/75 shadow-none">
            <CardHeader className="pb-3">
              <Badge tone="blue">Request</Badge>
              <CardTitle>Explizit ausloesen</CardTitle>
              <CardDescription>
                Diese Requests werden bewusst gestartet und oeffnen danach Editor
                und Ausgabe.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {requests.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => onSelectRequest(request.id)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition",
                    activeRequestId === request.id
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {request.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {organizerRequestDescriptions[request.id]}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/75 shadow-none">
            <CardHeader className="pb-3">
              <Badge tone="green">Display</Badge>
              <CardTitle>Immer sichtbar</CardTitle>
              <CardDescription>
                Diese Uebersichten laufen parallel mit und geben der Orga immer
                den aktuellen Stand.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <AutoListPanel
                title={organizerAutoPanels.attendees.title}
                subtitle={organizerAutoPanels.attendees.subtitle}
                items={organizerAutoPanels.attendees.items}
              />
              <AutoListPanel
                title={organizerAutoPanels.presentations.title}
                subtitle={organizerAutoPanels.presentations.subtitle}
                items={organizerAutoPanels.presentations.items}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white/80 shadow-none">
          <CardHeader>
            <Badge tone="blue">Eingabe-Editor</Badge>
            <CardTitle>{activeRequest.title}</CardTitle>
            <CardDescription>{activeRequest.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Mock-Eingaben
              </p>
              <div className="mt-4 space-y-3">
                {activeRequest.fields.map((field) => (
                  <div key={field} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {field}
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                      Platzhalter fuer Eingabe
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button>{activeRequest.cta}</Button>
              <Button variant="outline">Beispieldaten laden</Button>
              <Button variant="ghost">Zuruecksetzen</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/80 shadow-none">
          <CardHeader>
            <Badge tone="green">Ausgabe-Display</Badge>
            <CardTitle>{activeRequest.resultTitle}</CardTitle>
            <CardDescription>
              Das Display zeigt spaeter die unmittelbare Wirkung des ausgewaehlten Requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm leading-6 text-slate-700">
                {activeRequest.resultBody}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Visualisierte Rueckmeldung
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MockInfoTile title="Status" value="Bereit fuer Dummy-Klick" />
                <MockInfoTile title="Trigger" value={activeRequest.title} />
                <MockInfoTile title="Naechster Schritt" value="Slice anbinden" />
                <MockInfoTile title="Live-Uebersichten" value="bleiben sichtbar" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AutoListPanel({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ name: string; role: string; detail: string }>;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
        {subtitle}
      </p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={`${item.name}-${item.role}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
          >
            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
            <p className="text-sm text-slate-600">{item.role}</p>
            <p className="text-xs text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockInfoTile({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function RolePlaceholder({
  perspective,
}: {
  perspective: (typeof perspectives)[number];
}) {
  return (
    <div className="flex h-full min-h-[34rem] items-center justify-center">
      <Card className="max-w-xl border-slate-200 bg-white/85 shadow-none">
        <CardHeader>
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
          <CardTitle>{perspective.label}</CardTitle>
          <CardDescription>{perspective.intro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>
            Dieser Bereich bleibt im Dummy bewusst reduziert, bis wir den
            Veranstalter-Rahmen final bestaetigt haben.
          </p>
          <p>
            Danach uebertragen wir dieselbe Hierarchie auf diesen Bereich:
            Request-Auswahl, Editor und Display.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelinePreview({
  model,
}: {
  model: ReturnType<typeof buildTimelineModel>;
}) {
  return (
    <div className="timeline-grid rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-5">
      <div className="relative ml-14">
        <div
          className="pointer-events-none absolute left-0 right-0 z-20 h-[2px] bg-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.08)]"
          style={{ top: `${model.nowLineOffset}px` }}
        />

        {model.items.map((item) => (
          <div
            key={item.id}
            className="relative"
            style={{ marginTop: item.topOffset === 0 ? 0 : `${item.topOffset}px` }}
          >
            <time className="absolute -left-14 top-2 text-sm font-medium text-slate-500">
              {item.label}
            </time>
            <article
              className={cn("timeline-slot", timelineSlotClass[item.status])}
              style={{ height: `${item.height}px` }}
            >
              <p className="timeline-meta">
                {item.timeRange} / {item.room}
              </p>
              <p className="timeline-title">{item.title}</p>
              <p className="timeline-speaker">{item.speaker}</p>
            </article>
          </div>
        ))}

        <div
          className="absolute -left-14 text-sm font-semibold text-rose-600"
          style={{ top: `${model.nowLineOffset - 12}px` }}
        >
          Jetzt
        </div>
      </div>
    </div>
  );
}

const timelineSlotClass: Record<TimelineItem["status"], string> = {
  past: "timeline-slot-past",
  current: "timeline-slot-current",
  future: "timeline-slot-future",
  speaker: "timeline-slot-speaker",
};

function buildTimelineModel({
  items,
  now,
}: {
  items: TimelineItem[];
  now: Date;
}) {
  const sortedItems = [...items].sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
  const firstStart = new Date(sortedItems[0]?.startsAt ?? now).getTime();
  const minuteHeight = 2;

  const mappedItems = sortedItems.map((item, index) => {
    const start = new Date(item.startsAt).getTime();
    const end = new Date(item.endsAt).getTime();
    const durationMinutes = Math.max((end - start) / 60_000, 30);
    const previousEnd =
      index === 0
        ? start
        : new Date(sortedItems[index - 1]!.endsAt).getTime();
    const gapMinutes = Math.max((start - previousEnd) / 60_000, 0);

    return {
      ...item,
      label: formatTime(new Date(item.startsAt)),
      timeRange: `${formatTime(new Date(item.startsAt))}-${formatTime(new Date(item.endsAt))}`,
      topOffset: gapMinutes * minuteHeight,
      height: durationMinutes * minuteHeight,
    };
  });

  const nowLineOffset =
    Math.max((now.getTime() - firstStart) / 60_000, 0) * minuteHeight;

  return {
    items: mappedItems,
    nowLineOffset,
  };
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
