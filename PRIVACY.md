# Datenschutz

Diese Anwendung kann optional Fehler-Telemetrie und Performance-Metriken an Sentry senden.

- **Welche Daten?** Fehler-Stacktraces und anonyme Web-Vital-Metriken. Es werden keine personenbezogenen Daten übermittelt; URLs werden bereinigt und Koordinaten gerundet.
- **Opt-In:** Standardmäßig ist die Telemetrie deaktiviert. Die Übermittlung kann jederzeit im Einstellungsdialog aktiviert oder deaktiviert werden.
- **Dienstleister:** Die Events werden an den Betreiber des konfigurierten Sentry-DSN übermittelt und dort gespeichert.

Weitere Details finden sich im Quellcode der Datei `src/lib/telemetry`.
