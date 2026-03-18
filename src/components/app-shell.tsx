import { useEffect, useMemo, useState } from "react";

import { perspectives, timelineItems, type PerspectiveId, type TimelineItem } from "@/lib/mock-data";
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

const toneByKind = {
  command: {
    badge: "blue" as const,
    panel: "bg-sky-100/70 border-sky-200",
    dot: "bg-sky-500",
  },
  query: {
    badge: "green" as const,
    panel: "bg-emerald-100/70 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

export function AppShell() {
  const [activePerspective, setActivePerspective] =
    useState<PerspectiveId>("organizer");
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
          <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              <Badge className="bg-white/12 text-white" tone="neutral">
                Expo Fraunhofer Exposed
              </Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  Klick-Dummy fuer Veranstalter, Referenten und Teilnehmer
                </h1>
                <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                  Die UI sitzt als eigenstaendige Schicht ueber den bestehenden
                  Slices. Heute nur als klickbarer Dummy, spaeter mit den Commands
                  und Queries verdrahtet.
                </p>
              </div>
            </div>

            <Card className="border-white/10 bg-white/8 text-white shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Rollen im UI</CardTitle>
                <CardDescription className="text-slate-300">
                  Jede Perspektive sieht nur die Aufgaben, die zu ihrer Rolle passen.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {perspectives.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setActivePerspective(entry.id)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                      activePerspective === entry.id
                        ? "border-white/70 bg-white text-slate-950"
                        : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold">{entry.label}</p>
                      <p className="text-xs opacity-70">{entry.eyebrow}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em]">
                      {entry.commandCards.length + entry.queryCards.length} Views
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
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
              <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <Badge
                    tone={
                      perspective.accent === "blue"
                        ? "blue"
                        : perspective.accent === "green"
                          ? "green"
                          : "red"
                    }
                  >
                    {perspective.eyebrow}
                  </Badge>
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {perspective.label}
                    </h2>
                    <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
                      {perspective.intro}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
                  Click dummy ohne Backend, vorbereitet fuer spaetere Slice-Anbindung.
                </div>
              </div>

              <div className="mt-6 space-y-8">
                <ActionGrid
                  title="Commands"
                  description="Blaue Karten loesen spaeter Commands gegen die passenden Slices aus."
                  cards={perspective.commandCards}
                />

                {perspective.queryCards.length > 0 ? (
                  <ActionGrid
                    title="Queries"
                    description="Gruene Karten lesen spaeter Datenmodelle fuer die jeweiligen Ansichten."
                    cards={perspective.queryCards}
                  />
                ) : null}
              </div>
            </div>
          </section>

          <aside className="grid gap-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <Badge tone="red">Timeline View Model</Badge>
                <CardTitle>Mein Zeitplan</CardTitle>
                <CardDescription>
                  Die rechte Spalte zeigt schon das spaetere Query-Ziel fuer Teilnehmer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimelinePreview model={timelineModel} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gedachte Query-Outputs</CardTitle>
                <CardDescription>
                  Fuer die noch offenen Queries schlage ich bewusst UI-taugliche View
                  Models vor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">Get all attendees:</span>{" "}
                  Liste aus Name, Rolle, E-Mail, Registrierungsstatus und letzten
                  Aktivitaeten.
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Get all presentations:</span>{" "}
                  Liste aus Titel, Referenten, Track-Vorschlag, Einreichungsstatus und
                  Kurzabstract.
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Get my timeline:</span>{" "}
                  Chronologische Sessions mit Statusfarbe, Raum, Uhrzeit,
                  Vortragstitel und Speaker-Info.
                </p>
              </CardContent>
            </Card>
          </aside>
        </main>
      </div>
    </div>
  );
}

function ActionGrid({
  title,
  description,
  cards,
}: {
  title: string;
  description: string;
  cards: Array<(typeof perspectives)[number]["commandCards"][number]>;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {cards.map((card) => {
          const tone = toneByKind[card.kind];

          return (
            <Card
              key={card.id}
              className={cn(
                "overflow-hidden border shadow-[0_14px_38px_rgba(15,23,42,0.07)]",
                tone.panel,
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Badge tone={tone.badge}>{card.kind}</Badge>
                    <CardTitle>{card.title}</CardTitle>
                  </div>
                  <span
                    className={cn(
                      "mt-1 inline-flex h-3.5 w-3.5 rounded-full border-2 border-white",
                      tone.dot,
                    )}
                  />
                </div>
                <CardDescription>{card.summary}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Form-Felder
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {card.fields.map((field) => (
                      <li key={field} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span>{field}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline">{card.cta}</Button>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Slice-ready
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/65 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {card.resultTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {card.resultBody}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
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

        <div className="absolute -left-14 text-sm font-semibold text-rose-600" style={{ top: `${model.nowLineOffset - 12}px` }}>
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

  const nowLineOffset = Math.max((now.getTime() - firstStart) / 60_000, 0) * minuteHeight;

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
