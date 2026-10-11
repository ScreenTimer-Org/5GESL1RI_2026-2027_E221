# Screentimer

Exam / break screen shown on a classroom projector. It shows the countdown, the course and room, the school logo, the time students may leave, the exam instructions and a live FAQ read from an Etherpad pad.

The app is a static SPA with no backend: `bun run build` outputs `dist/`, which can be served by any stateless web server or CDN.

## Development

```bash
bun install
bun run dev
bun run build
```

## Configuration

Config values are resolved in this order, each one overriding the previous:

1. Built-in defaults (`src/config/schema.ts`)
2. JSON file: `config.json` next to `index.html`, or another file given with `?config=path/to/file.json`
3. URL query parameters

Changes made in the settings panel (⚙ button, bottom right) are written straight to the URL. Share or bookmark the URL to reuse a setup. **Export JSON** downloads the full config. You can serve that file as `config.json` or pass it with `?config=`.

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
| `instructions` | text                 | One instruction per line                           |
| `pad`          | URL                  | Etherpad pad used as the FAQ source                |
| `faqRefresh`   | seconds (≥ 60)       | FAQ polling interval (see rate limiting below)     |
| `cycle`        | seconds (≥ 3)        | Time each instructions / FAQ page stays on screen  |

Example: `?course=Algorithmique&room=B204&duration=90&start=14:00`

The timer depends only on the config, so every class that opens the same URL shows the same countdown.

## Instructions and FAQ

Both share one panel, which takes half the screen and rotates every `cycle` seconds. It is always shown in exam mode. It shows only the instructions while the FAQ is empty; without instructions, it always shows the FAQ, with a placeholder while it is empty. Once questions appear on the pad, it cycles through the instructions and the FAQ, split into as many pages as it takes for every Q&A to fit on screen.

## FAQ (Etherpad)

The app polls `<pad>/export/txt`. The pad holds a JSON list, and this is the only accepted format:

```json
[
  { "question": "La calculatrice est-elle autorisée ?", "answer": "Non." },
  { "question": "Peut-on sortir plus tôt ?", "answer": "Oui, après 30 minutes.\nSignez la feuille." },
  { "question": "Question en attente de réponse ?", "answer": "" }
]
```

- Every object has exactly two text fields, `question` (not empty) and `answer` (may be empty: the question is shown as pending). `\n` starts a new line.
- Anything else (missing or extra field, wrong type, more than 200 entries) makes the whole pad invalid.
- While the pad is invalid (typically while a teacher is typing), screens keep showing the last valid FAQ with the status « FAQ en cours de modification (JSON invalide) ».

**Nouveau Framapad (1 semaine)** creates an unguessable pad on `hebdo.framapad.org`, sets it as `pad` and opens it. Framapad's welcome text is not valid FAQ JSON, so screens report it as invalid until it is replaced by the FAQ list.

The pad is untrusted: it is parsed as JSON and validated with valibot, capped (200 KB, 200 entries, 2,000 characters per field), stripped of control and bidi-override characters, and rendered as plain text only.

### Rate limiting

Etherpad limits exports **per IP address**: Framapad answers with `x-ratelimit-limit: 10`, i.e. 10 exports per 90 s window (Etherpad's default). Past the limit it stops responding instead of returning an error. All the screens of a school usually go out through the same public IP, so they share this budget: **N screens need `faqRefresh` ≥ 9 × N seconds** (60 s covers about 6 screens, 120 s about 13).

The app never overlaps requests, gives up on a request after 15 s, doubles the interval after each failure (up to 5 min), spreads screens with ±15 % jitter and does not poll from hidden tabs.

Public Etherpad instances (Framapad included) allow cross-origin reads of the export. If yours doesn't, have the web server proxy the pad under the same origin (for example an nginx `location /pad/` block) and set `pad` to that path.

## Security

- Every input (URL, `config.json`, imported file, config panel) is validated field by field with the valibot schema in `src/config/schema.ts`. Invalid values are dropped and the rest of the config is kept.
- `logo` and `pad` only accept `http(s)` links or relative paths. `javascript:`, `data:` and similar URLs are rejected. The logo is loaded as an `<img>` without sending a referrer, and it is hidden if it fails to load.
- `?config=` only loads JSON files from the page's own origin.
- Text from the config and the pad is rendered as text, never as HTML. The built page also ships a Content-Security-Policy.

## Docker

```bash
docker build -t screentimer .
docker run -p 8080:8080 screentimer
```

The image builds the app with Bun/Vite and serves `dist/` with an unprivileged nginx (`nginx.conf`: SPA fallback, cache and security headers). To use your own default config without rebuilding:

```bash
docker run -p 8080:8080 -v ./config.json:/usr/share/nginx/html/config.json:ro screentimer
```

