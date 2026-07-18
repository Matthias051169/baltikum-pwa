# Baltikum PWA – Systemdokumentation

Stand: 18. Juli 2026

Diese Dokumentation fasst den aktuellen technischen Zustand der Baltikum-Facebook-Content-App zusammen: die Progressive Web App (PWA), alle zugehörigen n8n-Workflows und die Supabase-Datenbank.

---

## 1. Überblick

Die App ist eine mobile Web-App (installierbar auf dem iPhone via "Zum Home-Bildschirm hinzufügen"), über die Matthias Loheide automatisch generierte und manuell erstellte Facebook-Posts für den Roman "Baltikum" prüfen, freigeben, ablehnen und verwalten kann.

**Live-Adresse der App:** `https://n8n.taila03b27.ts.net/webhook/baltikum-pwa`

**Infrastruktur:** Selbstgehostetes n8n auf einem Raspberry Pi 5, per Tailscale Funnel erreichbar unter `n8n.taila03b27.ts.net`. Datenbank: Supabase-Projekt `baltikum-pr-assistant` (Projekt-ID `zzpulkpkrawabhujhaiw`, Region eu-west-1).

**GitHub-Backup:**
- Frontend (`index.html`, `sw.js`, `manifest.json`): dieses Repo (`baltikum-pwa`)
- n8n-Workflows: `baltikum-automation`, Ordner `n8n/pwa-backend/`

---

## 2. n8n-Workflows

### 2.1 Heute neu gebaute Workflows (Session-Ergebnis)

| Workflow | Zweck | Wichtigste Endpunkte |
|---|---|---|
| **Baltikum - PWA Host** | Liefert die App selbst aus (HTML, Manifest, Icons, Service Worker) | `GET /baltikum-pwa`, `/baltikum-pwa/icons/*`, `/baltikum-pwa/sw.js`, `/baltikum-pwa/manifest.json` |
| **Baltikum - PWA API** | Kernfunktionen: Freigaben laden, Verlauf, Statistik, Freigeben/Ablehnen/Archivieren, manuelle Posts | `/baltikum-pwa-pending`, `/baltikum-pwa-history`, `/baltikum-pwa-stats`, `/baltikum-pwa-approve`, `/baltikum-pwa-reject`, `/baltikum-pwa-archive`, `/baltikum-pwa-manual` |
| **Baltikum - PWA Auth** | Login, Ersteinrichtung, weitere Nutzer anlegen | `/baltikum-pwa-login`, `/baltikum-pwa-register`, `/baltikum-pwa-add-user` |
| **Baltikum - PWA Restore** | Abgelehnte Posts zurück in die Freigaben-Liste holen | `/baltikum-pwa-restore` |
| **Baltikum - PWA Reset** | Passwort vergessen (E-Mail-Code via Resend) | `/baltikum-pwa-forgot-password`, `/baltikum-pwa-reset-password` |
| **Baltikum - PWA Users** | Nutzerliste abrufen, Nutzer entfernen | `/baltikum-pwa-list-users`, `/baltikum-pwa-remove-user` |
| **Baltikum - PWA Change Password** | Eigenes Passwort ändern (im eingeloggten Zustand) | `/baltikum-pwa-change-password` |
| **Baltikum - PWA Edit** | Text/Titel eines Posts vor der Freigabe bearbeiten | `/baltikum-pwa-edit` |
| **Baltikum - PWA Insights** | Facebook-Performance-Zahlen (Likes/Kommentare) für veröffentlichte Posts abrufen | `/baltikum-pwa-post-insights` |

Alle Endpunkte außer Login/Register/Forgot-Password/Reset-Password erwarten einen gültigen `session_token` (siehe Abschnitt 4, Sitzungs-Tokens).

**Hinweis zum GitHub-Backup:** Die Workflows in `baltikum-automation/n8n/pwa-backend/` spiegeln den Stand nach allen heutigen Korrekturen wider – **außer "Baltikum - PWA Host"**, das dort bewusst nicht abgelegt wurde, weil die darin eingebettete HTML-Antwort ein alter Zwischenstand wäre. Der tatsächlich aktuelle Inhalt für den Node "Respond - Index HTML" ist die `index.html` in diesem Repo.

### 2.2 Bereits vorher bestehende Workflows (nicht Teil der heutigen Session)

| Workflow | Zweck (bekannt) |
|---|---|
| **Baltikum - Facebook Content Generator (Multi-Agent-Test)** | Nimmt manuelle oder automatische Eingaben entgegen, ruft einen Orchestrator auf, baut den finalen Bild-Prompt, erzeugt Bild via fal.ai/OpenAI und postet auf Facebook. Webhook-Pfad: `/baltikum-manual-entry`. **Heute bearbeitete Nodes darin:** "Set Baltikum Context" (Säulen-Auswahl korrigiert), "Orchestrator aufrufen" (Ort-Übergabe ergänzt), "Build Final Image Prompt" (Motive ohne Bildschirme/Anzeigetafeln, um Rechtschreibfehler im Bild zu vermeiden). |
| **Baltikum - Facebook Content Generator (Semantic Duplicate)** | Erkennung von inhaltlich ähnlichen/doppelten Posts. Nicht im Detail untersucht. |
| Weitere Multi-Agent-Workflows (Orchestrator, Content-Agent, Duplicate-Guard-Agent) | Aus früheren Sessions bekannt, heute nicht angefasst. Für eine vollständige Dokumentation dieser Workflows empfiehlt sich eine eigene Session, in der sie gezielt durchgegangen werden. |

---

## 3. Supabase-Datenbank

### 3.1 Haupttabelle

**`baltikum_facebook_posts`** – zentrale Tabelle für alle generierten/manuellen Posts.
Relevante Felder (nicht vollständig): `id`, `headline`, `facebook_text`, `final_facebook_post` (tatsächlich geposteter Text), `hashtags`, `content_pillar`, `public_image_url`, `approval_token`, `status` (`pending_approval` / `published` / `approval_aborted` / `duplicate_skipped` / `archived` u. a.), `publish_mode` (`test` / `live`), `facebook_post_id` (echte Facebook-Post-ID nach Veröffentlichung), `created_at`, `raw_payload` (JSON mit u. a. `rejection_reason`, `location`/`manual_location`, `prepared_node`).

### 3.2 Heute neu angelegte Tabellen

| Tabelle | Zweck | Felder |
|---|---|---|
| **`baltikum_pwa_users`** | Nutzerkonten der App | `id`, `username`, `password_hash` (Format `salt:hash`, scrypt), `email`, `created_at`, `created_by` |
| **`baltikum_pwa_sessions`** | Angelegt für eine mögliche künftige echte Sitzungs-Widerrufbarkeit, **aktuell ungenutzt** (Sitzungen sind stateless, siehe Abschnitt 4) | `token`, `user_id`, `created_at`, `expires_at`, `remember` |
| **`baltikum_pwa_reset_codes`** | Codes für "Passwort vergessen" | `id`, `user_id`, `code`, `created_at`, `expires_at`, `used` |
| **`baltikum_pwa_rate_limits`** | Rate-Limiting für Login und Passwort-Reset | `key` (z. B. `login:admin` oder `reset:email@x.de`), `attempt_count`, `window_start`, `locked_until` |

### 3.3 Postgres-Funktionen (RPC)

| Funktion | Zweck |
|---|---|
| `baltikum_check_rate_limit(p_key text)` | Prüft und zählt Versuche hoch; sperrt nach 5 Versuchen für 15 Minuten innerhalb eines 15-Minuten-Fensters. Gibt `{allowed: bool, locked_until?: timestamp}` zurück. |
| `baltikum_reset_rate_limit(p_key text)` | Setzt den Zähler für einen Schlüssel zurück. |

---

## 4. Sitzungs-Tokens (Login-Mechanismus)

Die App nutzt **stateless** Sitzungs-Tokens (kein Datenbank-Abruf bei jeder Prüfung, dafür sehr schnell):

- Aufbau: `base64url(username|ablaufzeitpunkt).signatur`
- Signatur: HMAC-SHA256 mit einem festen `SESSION_SECRET`, das in jedem Access-Check-Node hinterlegt ist
- Gültigkeitsdauer: 12 Stunden ohne "Angemeldet bleiben", 14 Tage mit "Angemeldet bleiben" (bewusst von ursprünglich 180 Tagen verkürzt)
- **Wichtige Einschränkung:** Ein einmal ausgestelltes Token kann nicht vorzeitig für ungültig erklärt werden (kein "alle Geräte abmelden" möglich). Die Tabelle `baltikum_pwa_sessions` wurde für eine echte, widerrufbare Lösung angelegt, aber bewusst nicht aktiviert, da dafür alle 8+ bestehenden Endpunkte umgebaut werden müssten. Falls das später gewünscht ist, ist das der Ansatzpunkt.

---

## 5. Externe Dienste & Zugangsdaten

| Dienst | Verwendung |
|---|---|
| **Resend** | E-Mail-Versand für "Passwort vergessen" (Absender `noreply@matthiasloheide.de`, Domain verifiziert) |
| **Facebook Graph API** | Veröffentlichen von Posts (`/photos`-Endpunkt) und Abrufen von Performance-Zahlen (Likes/Kommentare), via Zugangsdaten "Facebook - Page Token" |
| **Supabase** | Datenbank für alle Tabellen oben, Zugriff über in n8n hinterlegte Zugangsdaten (Header Auth mit API-Key) |

---

## 6. App-Funktionsüberblick (Stand heute)

- **Login-Bereich:** Anmelden, Ersteinrichtung, weitere Nutzer anlegen, Passwort vergessen (E-Mail-Code), Nutzerverwaltung (Liste + Entfernen), eigenes Passwort ändern – alle mit Rate-Limiting gegen Brute-Force
- **Freigaben:** Karten mit Bild, Text, Kartenvorschau bei Ort, Wischen zum Freigeben/Ablehnen, Text vor Freigabe bearbeitbar, Ablehnen mit/ohne Grund oder Abbrechen
- **Neuer Anlass (manuell):** Themenauswahl, Ort mit Kartenvorschau (anklickbar → Google Maps), Termin (Datum + Uhrzeit)
- **Verlauf:** Filterbar, durchsuchbar, seitenweise (5 initial, +10 pro Klick), Wiederherstellen abgelehnter Posts, Facebook-Performance-Zahlen bei veröffentlichten Posts
- **Statistik:** Aktivitäts-Diagramm (14 Tage), Heatmap (13 Wochen), Kennzahlen-Kacheln, Aufschlüsselung nach Thema, Ablehnungsgründe, geschätzte Kosten
- **Technisch:** Installierbar als iPhone-App, Service Worker für Offline-Fähigkeit der App-Hülle, Pull-to-Refresh-Geste, klare Meldungen bei Verbindungsproblemen

---

## 7. Offene Punkte / bewusst zurückgestellt

- Echte, serverseitig widerrufbare Sitzungen (siehe Abschnitt 4) – aktuell nur kürzere Ablaufzeiten als Kompromiss
- Vollständige Dokumentation der Multi-Agent-Content-Generator-Workflows (Orchestrator, Content-Agent, Duplicate-Guard-Agent) – heute nur punktuell bearbeitet, nicht vollständig durchleuchtet
- "Baltikum - PWA Host"-Workflow ist nicht als JSON gesichert (siehe Hinweis in Abschnitt 2.1)

---

*Diese Dokumentation wurde am 18. Juli 2026 im Rahmen der heutigen Entwicklungssession erstellt und spiegelt den Stand zu diesem Zeitpunkt wider.*
