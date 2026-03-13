# Template Library

Schnell-Referenz für häufig benötigte Code-Bausteine. Öffne die Datei, suche nach der Überschrift (z. B. "Large Base Button"), kopiere den Snippet und passe ihn an.

| Datei | Inhalt |
|-------|--------|
| `buttons.md` | `.btn-primary`, `.btn-outline`, `.btn-large`, loading state, danger |
| `form-fields.md` | Input, Textarea, Select, Checkbox — mit `fieldErrors` & `.form-error` |
| `modal-overlay.md` | Confirmation-Modal, Modal mit Formular |
| `page-layout.md` | AccountLayout-Seite, öffentliche Seite, CSS-Skeleton |
| `api-module.md` | API-Modul (GET/POST/PUT/DELETE + File Upload) |
| `backend-handler.md` | Go-Handler, DB-Helper, Migration, Route-Registrierung |
| `i18n-keys.md` | Übersetzungs-Keys hinzufügen (de.json + en.json) |

## CSS-Variablen (variables.css)

```css
/* Farben */
--clr-bg, --clr-bg-light, --clr-bg-card, --clr-surface
--clr-border, --clr-text, --clr-text-muted
--clr-accent, --clr-accent-light, --clr-accent-dark

/* Abstände */
--space-xs (.5rem)  --space-sm (1rem)  --space-md (1.5rem)
--space-lg (3rem)   --space-xl (5rem)  --space-2xl (8rem)

/* Border-Radius */
--radius-sm (6px)  --radius-md (10px)  --radius-lg (16px)

/* Sonstige */
--transition (0.3s ease)  --shadow  --max-width (1200px)
```

## Wichtige Konventionen

- **CSS**: Kein Tailwind, keine CSS-Module — plain CSS mit Klassen in `src/styles/`
- **API-Calls**: Immer über `src/api/*.ts` Module — nie direkt `fetch`/`axios` in Komponenten
- **Formulare**: `fieldErrors` State + `.error` Klasse auf `.form-field` + `.form-error` Span
- **i18n**: `const { t } = useI18n()` für alle sichtbaren Strings
- **Backend DB**: SQL-Queries nur in `db.go`, Handler rufen Helper-Funktionen auf
- **Neue Tabellen**: In `initDB()` in `db.go` eintragen (idempotent, läuft bei jedem Start)
