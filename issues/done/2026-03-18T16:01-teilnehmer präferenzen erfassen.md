Im Bereich "Teilnehmer" jetzt der Request zum Erfassen der Präferenzen.

Zuerst wählt man aus, wer man in der Liste der Teilnehmer ist. Das kann durch eine Suche geschehen.

Dann wählt man aus der Liste der Präsentationen die, die man wirklich besuchen will. Die übernimmt man in einen Bereich, in dem man sie ranken kann durch hoch/runter Verschiebung.

Und am Ende schickt man seine Präfenzliste ab.
---
Umgesetzt wurde eine server-angebundenen Teilnehmeransicht mit Auswahl des eigenen Teilnehmers per Suche, einer Liste verfügbarer Präsentationen zum Übernehmen in die Präferenzliste, Ranking per Hoch/Runter/Entfernen und dem Absenden an das `submit-preferences`-Slice. Zusätzlich wurden die benötigten IDs in den serverseitigen Teilnehmer- und Präsentations-Queries ergänzt, damit die Präferenzen fachlich korrekt gespeichert werden können. Verifiziert mit `npm test` und `npm run build`.
