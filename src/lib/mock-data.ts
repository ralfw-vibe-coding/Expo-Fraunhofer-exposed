export type PerspectiveId = "organizer" | "speaker" | "attendee";

export type TimelineStatus = "past" | "current" | "future" | "speaker";

export type TimelineItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  room: string;
  title: string;
  speaker: string;
  status: TimelineStatus;
};

export type ActionCardModel = {
  id: string;
  kind: "command" | "query";
  title: string;
  summary: string;
  fields: string[];
  cta: string;
  resultTitle: string;
  resultBody: string;
};

export type PerspectiveModel = {
  id: PerspectiveId;
  label: string;
  eyebrow: string;
  intro: string;
  accent: "blue" | "green" | "red";
  commandCards: ActionCardModel[];
  queryCards: ActionCardModel[];
};

export const perspectives: PerspectiveModel[] = [
  {
    id: "organizer",
    label: "Veranstaltungsorganisation",
    eyebrow: "Expo steuern",
    intro:
      "Die Organisation bündelt Setup, Teilnehmerverwaltung und die spätere Planung in einer ruhigen Leitstelle.",
    accent: "blue",
    commandCards: [
      {
        id: "create-expo",
        kind: "command",
        title: "Expo anlegen",
        summary:
          "Grunddaten, Tage, Tracks und Deadlines einmal erfassen und als Startpunkt der Veranstaltung setzen.",
        fields: [
          "Name der Expo",
          "Expo-Tage mit Datum",
          "Tracks / Räume",
          "Abstract-Deadline",
          "Präferenz-Deadline",
        ],
        cta: "Expo vorbereiten",
        resultTitle: "Geplanter Rückkanal",
        resultBody:
          "Die UI zeigt nachher die angelegte Expo-Konfiguration mit Tagen, Räumen und Deadlines an.",
      },
      {
        id: "register-attendees",
        kind: "command",
        title: "Teilnehmer registrieren",
        summary:
          "Neue Teilnehmer gesammelt aufnehmen, damit sie später Präferenzen abgeben und in den Schedule eingeplant werden können.",
        fields: ["Liste von Personen", "Name", "E-Mail", "Rolle im Event"],
        cta: "Teilnehmer erfassen",
        resultTitle: "Geplanter Rückkanal",
        resultBody:
          "Die UI bestätigt die neu registrierten Personen und aktualisiert danach die Übersichten.",
      },
      {
        id: "schedule-presentations",
        kind: "command",
        title: "Schedule generieren",
        summary:
          "Auf Basis der vorhandenen Präsentationen, Referenten und Präferenzen den Zeitplan auslösen.",
        fields: ["Keine zusätzlichen Eingaben", "Start per Action-Button"],
        cta: "Zeitplan erzeugen",
        resultTitle: "Geplanter Rückkanal",
        resultBody:
          "Die UI zeigt den generierten Expo-Plan an und markiert Konflikte oder fehlende Voraussetzungen verständlich.",
      },
    ],
    queryCards: [
      {
        id: "get-all-attendees",
        kind: "query",
        title: "Alle Teilnehmer ansehen",
        summary:
          "Schnelle Übersicht über alle registrierten Personen, damit Orga und Moderation nicht im Blindflug arbeiten.",
        fields: ["Name", "E-Mail", "Rolle", "Status"],
        cta: "Liste öffnen",
        resultTitle: "Mock-View-Model",
        resultBody:
          "Ada Lovelace, Sandy Meyer und David Kim erscheinen als filterbare Teilnehmerliste mit Rollen-Badges.",
      },
      {
        id: "get-all-presentations",
        kind: "query",
        title: "Alle Präsentationen ansehen",
        summary:
          "Programmüberblick mit Vortragstiteln, Referenten und dem Bearbeitungsstand der Einreichungen.",
        fields: ["Titel", "Referenten", "Status", "Track-Vorschlag"],
        cta: "Programm öffnen",
        resultTitle: "Mock-View-Model",
        resultBody:
          "Die Ergebnisse landen in einer kuratierten Programmliste mit Statuschips und späterem Drilldown.",
      },
    ],
  },
  {
    id: "speaker",
    label: "Referenten",
    eyebrow: "Vorträge einreichen",
    intro:
      "Referenten bekommen eine fokussierte Arbeitsfläche für ihre Einreichung, ohne organisatorische Nebenwege.",
    accent: "red",
    commandCards: [
      {
        id: "submit-presentation",
        kind: "command",
        title: "Präsentation einreichen",
        summary:
          "Titel, Abstract, Co-Referenten und Cover sammeln, damit die Einreichung vollständig vorbereitet ist.",
        fields: ["Titel", "Abstract", "Referenten-IDs", "Coverbild / Visual"],
        cta: "Einreichung prüfen",
        resultTitle: "Geplanter Rückkanal",
        resultBody:
          "Die UI zeigt nach dem Submit die erfasste Präsentation mit Einreichungsstatus und Vorschau.",
      },
    ],
    queryCards: [],
  },
  {
    id: "attendee",
    label: "Teilnehmer",
    eyebrow: "Programm erleben",
    intro:
      "Teilnehmer sehen nur das, was sie für Auswahl und Tagesnavigation brauchen: Präferenzen und den eigenen Zeitplan.",
    accent: "green",
    commandCards: [
      {
        id: "submit-preferences",
        kind: "command",
        title: "Präferenzen einreichen",
        summary:
          "Interessante Vorträge auswählen und in eine Reihenfolge bringen, die später in die Planung einfließt.",
        fields: ["Teilnehmer-ID", "Präsentationsauswahl", "Priorisierung"],
        cta: "Präferenzen speichern",
        resultTitle: "Geplanter Rückkanal",
        resultBody:
          "Die UI bestätigt die Auswahl und zeigt, welche Wünsche bereits im System hinterlegt sind.",
      },
    ],
    queryCards: [
      {
        id: "get-my-timeline",
        kind: "query",
        title: "Meinen Zeitplan ansehen",
        summary:
          "Chronologische Liste aller eigenen Sessions mit klarer Lesbarkeit für Vergangenheit, Gegenwart und Zukunft.",
        fields: ["Teilnehmer-ID", "Tagesfilter optional"],
        cta: "Zeitplan öffnen",
        resultTitle: "Mock-View-Model",
        resultBody:
          "Die Timeline zeigt vergangene, aktuelle, kommende und eigene Speaker-Slots mit Now-Line im Minutenraster.",
      },
    ],
  },
];

export const timelineItems: TimelineItem[] = [
  {
    id: "slot-1",
    startsAt: "2026-03-18T10:00:00+01:00",
    endsAt: "2026-03-18T11:00:00+01:00",
    room: "Saal A",
    title: "Event Sourcing als Denkmodell",
    speaker: "Helene Weber",
    status: "past",
  },
  {
    id: "slot-2",
    startsAt: "2026-03-18T11:00:00+01:00",
    endsAt: "2026-03-18T12:00:00+01:00",
    room: "Saal B",
    title: "Projection Patterns im Expo-Setup",
    speaker: "Ralf Winkler",
    status: "current",
  },
  {
    id: "slot-3",
    startsAt: "2026-03-18T12:15:00+01:00",
    endsAt: "2026-03-18T13:00:00+01:00",
    room: "Studio 3",
    title: "Mein Vortrag: UI als Hülle über Slices",
    speaker: "Du",
    status: "speaker",
  },
  {
    id: "slot-4",
    startsAt: "2026-03-18T13:15:00+01:00",
    endsAt: "2026-03-18T14:00:00+01:00",
    room: "Saal C",
    title: "Live Timeline und Scheduling",
    speaker: "David Kim",
    status: "future",
  },
];

export const organizerAutoPanels = {
  attendees: {
    title: "Teilnehmerliste",
    subtitle: "Wird automatisch aktualisiert",
    items: [
      {
        name: "Ada Lovelace",
        role: "Teilnehmerin",
        detail: "ada@example.com",
      },
      {
        name: "Sandy Meyer",
        role: "Referent",
        detail: "sandy@example.com",
      },
      {
        name: "David Kim",
        role: "Teilnehmer",
        detail: "david@example.com",
      },
    ],
  },
  presentations: {
    title: "Praesentationsliste",
    subtitle: "Immer sichtbar fuer die Orga",
    items: [
      {
        name: "Event Sourcing als Denkmodell",
        role: "Helene Weber",
        detail: "Status: eingereicht",
      },
      {
        name: "Projection Patterns im Expo-Setup",
        role: "Ralf Winkler",
        detail: "Status: reviewbereit",
      },
      {
        name: "Live Timeline und Scheduling",
        role: "Patrick Sommer",
        detail: "Status: mit Cover",
      },
    ],
  },
};
