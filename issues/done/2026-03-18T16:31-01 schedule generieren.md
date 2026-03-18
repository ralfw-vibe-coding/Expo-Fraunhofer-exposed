Im Bereich Veranstalter jetzt der Request zum Generieren des Schedules.
Es muss ja nur ein Button geklickt werden, um das auszulösen.
---
Umgesetzt wurde im Bereich Veranstaltungsorganisation ein eigener Request `Schedule generieren lassen` mit schlanker Arbeitsfläche: links ein klarer Auslöse-Button ohne zusätzliche Eingaben, rechts die Processor-Rückmeldung sowie eine kompakte Zusammenfassung des zuletzt generierten Schedules. Der Request ist an das serverseitige `schedule-presentations`-Slice über den Client-Proxy angebunden. Verifiziert mit `npm test` und `npm run build`.
