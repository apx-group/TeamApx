# i18n — Template Library

Translations live in `i18n/de.json` and `i18n/en.json`.
Always add both DE + EN keys when adding a new string.

## Usage in Components

```tsx
import { useI18n } from '@/contexts/I18nContext'

const { t } = useI18n()

<h1>{t('myPage.title')}</h1>
<p>{t('myPage.description') || 'Fallback text'}</p>
```

## Key Naming Convention

```
<page/section>.<element>
```

Examples:
```
badges.title
badges.locked
apply.submitBtn
security.changeEmail
nav.profile
errors.generic
```

## Adding New Keys

**de.json**
```json
{
  "myPage": {
    "title": "Mein Bereich",
    "description": "Hier kannst du deine Einstellungen verwalten.",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "deleteConfirm": "Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden."
  }
}
```

**en.json**
```json
{
  "myPage": {
    "title": "My Section",
    "description": "Here you can manage your settings.",
    "save": "Save",
    "cancel": "Cancel",
    "deleteConfirm": "Are you sure? This action cannot be undone."
  }
}
```

## Common Reusable Keys (Already Exist)

Check `i18n/de.json` for the full list. Common ones:
- `nav.*` — navigation labels
- `apply.*` — application form
- `security.*` — security page
- `profile.*` — profile page
