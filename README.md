# Baltikum Freigabe-PWA — Setup

## 1. n8n-Workflow importieren
1. Datei `Baltikum_PWA_API.json` in n8n importieren (neuer, separater Workflow)
2. Workflow öffnen, **Publish/Aktivieren**
3. Prüfen: Beide Webhook-Nodes nutzen das bestehende Credential „Supabase - apikey" — falls der Authorization-Header dort noch den alten Platzhalter-Wert hat, im Node „Supabase - Get Pending" und „Supabase - Get All Status" den echten Bearer-Wert eintragen (denselben wie in den anderen Supabase-Nodes)

## 2. PWA auf GitHub Pages veröffentlichen
1. Neues Repository anlegen (z. B. `baltikum-pwa`) oder bestehendes Backup-Repo nutzen
2. Dateien `index.html`, `manifest.json`, `sw.js`, `icon.svg` in den Repo-Root hochladen
3. Unter **Settings → Pages**: Branch `main`, Ordner `/ (root)` auswählen, speichern
4. Nach 1-2 Minuten ist die App unter `https://<dein-github-username>.github.io/<repo-name>/` erreichbar

## 3. Auf dem Handy installieren
- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → „Zum Home-Bildschirm"
- **Android (Chrome):** Seite öffnen → Menü (drei Punkte) → „App installieren" bzw. „Zum Startbildschirm hinzufügen"

## Hinweis zur URL-Konfiguration
Die Basis-URL deiner n8n-Instanz ist fest in `index.html` hinterlegt (`N8N_BASE`). Falls sich die Tailscale-URL jemals ändert, dort anpassen.

## Sicherheitshinweis
Die beiden neuen n8n-Endpunkte (`baltikum-pwa-pending`, `baltikum-pwa-stats`) sind **öffentlich ohne Authentifizierung** erreichbar (wie der bestehende Freigabe-Webhook auch). Sie geben nur Post-Inhalte zurück, keine Secrets. Falls das nicht gewünscht ist, könnte n8n zusätzlich einen einfachen Query-Parameter als Zugriffsschlüssel prüfen — sag Bescheid, falls das ergänzt werden soll.
