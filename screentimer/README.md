# Screentimer

Exam / break screen shown on a classroom projector. It shows the countdown, the course and room, the school logo, the time students may leave, the exam instructions and a live FAQ. The config and the FAQ can be read from an Etherpad pad, a JSON / text file link or an imported file.

The app is a static SPA with no backend: `bun run build` outputs `dist/`, which can be served by any stateless web server or CDN.

## Development

```bash
bun install
bun run dev
bun run build
```

## Sources and local changes

The config and the FAQ each come from a **source**, either the same one or two different ones:

| Source                   | How to set it                                         | Shared by the link |
| ------------------------ | ----------------------------------------------------- | ------------------ |
| Page link only           | Nothing but the defaults and the local changes        | yes                |
| Etherpad pad / Framapad  | Pad link (`…/p/<name>`), read through `/export/txt`   | yes                |
| Link to a `.json`/`.txt` | Any http(s) link or path relative to the page         | yes                |
| Imported file            | Picked in the settings panel, kept in `localStorage`  | no, this browser only |

A source holds one JSON document. Both keys are optional, so one file can hold the config, the FAQ or both:

```json
{
  "config": { "course": "Algorithmique", "room": "B204", "duration": 90 },
  "faq": [{ "question": "La calculatrice est-elle autorisée ?", "answer": "Non." }]
}
```

Link sources are polled every `refresh` seconds, so editing the pad updates every screen. When the config and the FAQ use the same link, it is fetched once.

What the screen shows is resolved in layers:

- **Config**: built-in defaults (`src/config/schema.ts`), then the config source, then the local overrides.
- **FAQ**: the FAQ source, minus the questions hidden locally, plus the questions added locally.

Local changes are made in the settings panel (⚙ button, bottom right). Each overridden field is marked « modifié ↺ »; clicking it goes back to the source value. **Annuler les modifications locales** drops them all.

Sources and local changes are written to the page URL, so **Copier le lien** shares the whole setup. Imported files are the exception: they stay in the browser that imported them. **Exporter JSON** / **Copier JSON** give what the screen currently shows as a source document, ready to be served as a file or pasted into a pad.

### URL parameters

| Parameter    | Value                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| `src`        | Source of both the config and the FAQ                                        |
| `configSrc`  | Source of the config only (overrides `src`)                                  |
| `faqSrc`     | Source of the FAQ only (overrides `src`)                                     |
| config keys  | Local overrides, see the table below                                         |
| `faqAdd`     | Questions added locally (base64url JSON, written by the panel)               |
| `faqHide`    | Source questions hidden locally (comma-separated hashes of the question)     |

A source value is a link, `upload:<slot>` for an imported file, or empty for no source. Without any source parameter, both come from `config.json` next to `index.html`.

Example: `?src=https://hebdo.framapad.org/p/xyz&room=B204&start=14:00`

| Key            | Type                 | Description                                        |
| -------------- | -------------------- | -------------------------------------------------- |
| `mode`         | `exam` \| `break`    | A break only shows the timer                       |
| `course`       | text                 | Course name, shown above the timer                 |
| `room`         | text                 | Room, shown above the timer                        |
| `duration`     | minutes              | Exam or break duration                             |
| `start`        | `HH:MM[:SS]`         | Start time today; empty means not started          |
| `minStay`      | minutes              | Delay after the start before students may leave    |
| `warning`      | minutes              | Remaining time at which the timer turns orange     |
| `logo`         | http(s) link         | School logo (or a path relative to the page)       |
| `instructions` | Markdown             | One instruction per line (see Markdown below)      |
| `refresh`      | seconds (≥ 60)       | Source polling interval (see rate limiting below)  |
| `cycle`        | seconds (≥ 3)        | Time each instructions / FAQ page stays on screen  |

The timer depends only on the config, so every class that opens the same URL shows the same countdown.

## Instructions and FAQ

In exam mode, the timer sits in the top bar, between the logo and the clock, and the rest of the screen shows the instructions and the FAQ side by side. Each panel is split into as many pages as it takes for its content to fit on screen, and rotates every `cycle` seconds. The instructions are split between lines: a heading always stays with its first instruction, and the numbering carries on from one page to the next. When a panel has several pages, the ⏸ button in its header pauses its rotation on this screen, independently of the other panel. In break mode, only the timer is shown, in large.

## Markdown

The instructions and the FAQ accept a small Markdown subset, parsed by `src/markdown/parseMarkdown.ts`:

| Syntax                     | Result                          | Where                                      |
| -------------------------- | ------------------------------- | ------------------------------------------ |
| `# Title`, `## …`, `### …` | Heading (deeper levels as `###`) | Instructions, FAQ answers                  |
| `**bold**`                 | **bold**                        | Everywhere                                 |
| `*italic*`                 | *italic*                        | Everywhere                                 |
| `***both***`               | ***both***                      | Everywhere                                 |
| `\*`, `\#`, `\\`          | The character itself            | Everywhere                                 |

Anything else (links, lists, HTML…) stays plain text, and so does italic nested inside bold nested inside italic (`*a **b *c* b** a*`). In the instructions, every other line is a numbered instruction, and a heading starts a new group numbered from 1. The **T**, **G** and *I* buttons of the settings panel insert this syntax around the selection.

## FAQ format

The `faq` value of a source is a list:

```json
{
  "faq": [
    { "question": "La calculatrice est-elle autorisée ?", "answer": "Non." },
    { "question": "Peut-on sortir plus tôt ?", "answer": "Oui, après 30 minutes.\nSignez la feuille." },
    { "question": "Question en attente de réponse ?", "answer": "" }
  ]
}
```

- Every object has exactly two text fields, `question` (not empty) and `answer` (may be empty: the question is shown as pending). `\n` starts a new line, an empty line a new paragraph. Questions accept bold and italic, answers headings too.
- Anything else (missing or extra field, wrong type, more than 200 entries, unknown top-level key) makes the whole document invalid. Invalid config values, on the other hand, are dropped one by one.
- While a source is invalid (typically while a teacher is typing in the pad), screens keep showing its last valid version with the status « Source en cours de modification (JSON invalide) ».

**Nouveau Framapad** creates an unguessable pad on `hebdo.framapad.org`, sets it as the source and opens it. Framapad's welcome text is not valid JSON, so the source is reported invalid until it is replaced, e.g. with the output of **Copier JSON**.

Sources are untrusted: they are parsed as JSON and validated with valibot, capped (200,000 characters, 200 entries, 2,000 characters per field), stripped of control and bidi-override characters, and rendered as plain text only.

### Rate limiting

Etherpad limits exports **per IP address**: Framapad answers with `x-ratelimit-limit: 10`, i.e. 10 exports per 90 s window (Etherpad's default). Past the limit it stops responding instead of returning an error. All the screens of a school usually go out through the same public IP, so they share this budget: **N screens need `refresh` ≥ 9 × N seconds** (60 s covers about 6 screens, 120 s about 13). Using two different pads for the config and the FAQ doubles the number of requests.

The app never overlaps requests, gives up on a request after 15 s, doubles the interval after each failure (up to 5 min), spreads screens with ±15 % jitter and does not poll from hidden tabs.

## Security

- Every config input (URL, source, config panel) is validated field by field with the valibot schema in `src/config/schema.ts`. Invalid values are dropped and the rest of the config is kept.
- `logo` and source links only accept `http(s)` links or relative paths. `javascript:`, `data:` and similar URLs are rejected. The logo is loaded as an `<img>` without sending a referrer, and it is hidden if it fails to load.
- Sources may live on any origin. This gives a shared link no more power than its own query parameters already have: a source can only set config values and FAQ text, which go through the same validation.
- Sources are fetched without cookies or referrer. Text from the config and the sources is rendered as text, never as HTML: Markdown is parsed into a tree of plain strings, rendered as React elements. The built page also ships a Content-Security-Policy.

## Gitlab page

The .gitlab-ci.yml file has a job to build the bundled page using vite and push it as a Gitlab page