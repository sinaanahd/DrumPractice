# Tempo — Drum Training

Tempo is an installable, offline-first personal drum-practice companion. It turns a structured training plan into a calm session flow: open today’s plan, practice one exercise at a time, log a quick result, and review gradual progress.

The app has no backend, account, analytics, or cloud dependency. Practice data remains in the browser unless the user explicitly exports a JSON backup.

## Features

- Focused Today page and distraction-free Practice Mode
- Seeded Day 14 foundation session with 11 current exercises
- Web Audio metronome with scheduled clicks, beat-one accent, BPM controls, and tap tempo
- Countdown/stopwatch exercise timer that never auto-completes an exercise
- Fast result logging with optional detail fields and a session summary
- Editable, reorderable, duplicable, and inspectable sessions
- Session history with lightweight filtering
- Internal-timing deviation and tempo progress charts
- Exercise library, skill status, practice history, and custom exercises
- Foundation training roadmap and recovery protocol
- IndexedDB persistence, JSON export/import, and guarded reset
- Responsive light/dark/system themes
- Installable PWA with offline precaching

## Architecture

The application uses React 18, TypeScript, and Vite. Dexie provides a small typed IndexedDB layer. Long-term records live in IndexedDB; only the resumable active-session cursor and timer state use `localStorage`. React hooks and Dexie live queries keep UI state simple without a global state framework.

Key folders:

```text
src/
  app/          App shell and navigation
  components/   Shared presentational controls
  data/         Foundation seed program and roadmap
  db/           Versioned Dexie database
  features/     Session runner and editing flows
  hooks/        Web Audio metronome
  pages/        Today, Sessions, Progress, Exercises, Settings
  store/        Reload-safe active-session state
  types/        Domain models
  utils/        Calculations and backup validation
```

This browser-first design keeps a future Tauri 2 wrapper straightforward: storage and audio boundaries are isolated and there is no server runtime to replace.

## Development

Requires a recent Node.js release and npm.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
npm run build
```

Preview the production build:

```bash
npm run preview
```

## PWA installation and offline use

Run a production build and serve `dist/` over HTTPS (or localhost). In a supported browser, use **Install app** or **Add to Home Screen**. The generated service worker precaches the application shell and static assets. After the first successful load, the installed app opens and operates without a network connection.

The web server is only needed to deliver the installed files; Vite and Node do not remain part of the installed application.

## Data persistence and backups

Dexie stores exercises, sessions, exercise results, preferences, and roadmap state in the `tempo-drum-training` IndexedDB database. Reloading or closing the PWA does not discard an active or completed session.

Settings → **Export data** downloads a versioned JSON file containing all application data. **Import data** validates the file shape and version before replacing the current database in one transaction. **Reset all data** requires explicit confirmation and restores the original foundation plan.

Because browser storage can be cleared by the user or operating system, periodic exports are recommended.

### Historical training imports

Settings → **Import historical training data** accepts the separate `drum-practice-legacy-import` version 1 format. The app previews the completed/planned session counts and timing measurements before merging. Imports use stable source IDs, preserve unrelated records, update the current unstarted Day 14 plan in place, and safely skip unchanged data on repeated imports.

Historical sessions without source dates remain labeled **Date not recorded**. Their original notes and summaries are retained without fabricated exercise grades. Timing measurements are stored as structured, ungraded exercise results so they can power the internal-timing progress graph while remaining linked to their source session.
