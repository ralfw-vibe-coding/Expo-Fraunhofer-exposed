Zeige den Button "Vorrat leer" disabled, sobald er gedrückt wurde und noch kein neuer Einkauf gemeldet wurde. Es sollen doppelte Leer-Meldungen vermieden werden.
---
Umgesetzt: Der Button "Vorrat leer!" ist jetzt deaktiviert, solange der Vorrat laut aktuellem Status noch leer ist. Grundlage ist der bereits vorhandene `isSupplyDepleted`-Status aus dem Ranking-Result. Verifiziert mit `npm run build`.
