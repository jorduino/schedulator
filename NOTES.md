# Schedule template

## START OF SEASON SETUP

1. Read the PDF calendar they send you
2. Manually type the data into a JSON file (simple format — no timezone required if it can be inferred from the city):

   ```json
   {
     "engagements": [
       {
         "town": "Los Angeles",
         "shows": ["2025-01-01T19:00:00", "2025-01-02T19:00:00"]
       }
     ]
   }
   ```

3. Run the generator script. It will:
   - Ask for a timezone for any city that doesn't have one and can't be inferred
   - Generate the rotation schedule (see rotation rules below)
   - Output a `.ics` calendar file

4. Import the `.ics` file into Google Calendar (one time)

## DURING THE SEASON

1. When PDF gets updated:
   - Open Google Calendar
   - Manually add/delete/edit events as needed
   - Don't run the script again
   - Don't touch the JSON file again

---

## ROTATION RULES

- Shows are stored in chronological order; the rotation is computed **backwards** from the last show
- The **last show** of every engagement gets the initial (unrotated) employee assignment
- Each earlier show rotates the employee list forward by one step relative to the show after it
- Example with 3 locations and 3 employees:
  - Last show: Employee1→LocationA, Employee2→LocationB, Employee3→LocationC
  - Second-to-last: Employee2→LocationA, Employee3→LocationB, Employee1→LocationC
  - Third-to-last: Employee3→LocationA, Employee1→LocationB, Employee2→LocationC
- **`keepFirstShow`**: pass `true` to `generateRotation` or `forceGenerateRotation` to lock in the first show's assignment using the initial employee order, leaving it out of the backwards rotation. If the first show is already a string it will still have a placements object generated for it — it just won't be rotated.
- **Manual overrides**: if a show already has placements defined in the JSON (e.g. someone needs to be moved due to a doctor's appointment), `generateRotation` will leave that show alone. Use `forceGenerateRotation` to ignore all existing placements and recompute everything from scratch.

---

## DATA TYPES

- **`Schedule`** (current): the inclusive input/intermediate type. Shows can be either date strings or objects with `date` + `placements`. Timezone is optional. This is the correct shape for user input — there's no need for a more restrictive input type since timezones are valid optional fields.
- **`RotatedSchedule`**: the fully generated output type. All shows as objects with placements, timezone required on every engagement. Needed to make `createCalendarFile` safe at the type level — without it, that function can't enforce at compile time that every show has placements and every engagement has a timezone.

`getSimpleSchedule()` is an internal utility that strips placements back to date strings before a force-rotation. It doesn't represent a distinct user-facing format and doesn't need its own type.

---

## TIMEZONE LOOKUP

Timezone resolution lives in `src/timezones.ts` as the `Timezones` class, intentionally isolated and async for future GUI replacement. Current implementation uses Bun's built-in `prompt()`. Responses are cached in `Timezones.cache` (a `Map`) so each city is only asked once per run. Ctrl+C exits cleanly with a message.

Pass an `extCachePath` to the `Schedule` constructor to persist the cache to disk between runs. `readCache()` is called at the start of `generateRotation` and `writeCache()` at the end.

Resolution order:

1. City found in in-memory cache → return immediately
2. Exactly one match in `city-timezones` → return automatically
3. Multiple matches → numbered list, user picks or enters their own
4. No matches → user enters a timezone string manually

---

## GUI PLAN (branch: `gui`)

### Delivery

`Bun.serve()` HTTP server serving a Svelte frontend. Compiles to a single binary via `bun build --compile`. No Tauri (requires Rust), no Electron (heavy). Svelte was chosen over vanilla HTML because the timezone disambiguation step requires reactive multi-step UI that gets messy with manual DOM manipulation.

### Build pipeline

```sh
1. bun build src/frontend/app.ts --outdir public/   # compile Svelte → JS
2. bun build --compile src/server.ts --outfile dist/schedulator-gui
   # embeds public/* via Bun.file() references
```

The server only serves static files — all schedule logic runs client-side.

### What moves to the frontend

`schedule.ts`, `calendarFile.ts`, and `timezones.ts` are already pure TS with no Bun-specific logic. They move to the Svelte frontend unchanged, except:

| File | Change |
| --- | --- |
| `timezones.ts` | Replace `Bun.write()`/`Bun.file()` in `writeCache`/`readCache` with `localStorage` |
| `timezones.ts` | Replace `console.write()` (Bun-specific) with proper UI |
| `timezones.ts` | Replace `process.exit(1)` in `ask()` with `throw` |
| `schedule.ts` | No changes needed — `readCache`/`writeCache` calls just use the updated methods |
| `index.ts` | Replaced entirely by the web UI |

`city-timezones` and `zod` are both pure JS and work in the browser unchanged.

### Timezone cache

Use `localStorage` instead of a JSON file. Cookies were considered but rejected — 4KB limit, sent with every HTTP request, designed for server-client state sharing. The cache is purely client-side data.

### UI flow (replacing CLI flags)

| CLI flag | GUI replacement |
| --- | --- |
| `-g` (generate template) | Textarea pre-filled with `JSON.stringify(new Schedule(), null, 2)` on page load |
| `-s` (read schedule file) | File upload button that loads the file content into the textarea |
| `-o` (output path) | Client-side download of the generated `.ics` |

### Timezone disambiguation (pre-flight step)

Before generating, scan all towns in the JSON. For each without an explicit `timezone` field:

- Exactly one `city-timezones` match → resolved automatically (show as read-only)
- Multiple matches → show a `<select>` dropdown
- No matches → show a text input for manual IANA entry

"Generate" button is disabled until all towns are resolved. Resolved choices are persisted to `localStorage` cache so they don't need re-entering.

### Component structure

```text
App
├── ScheduleEditor      (textarea + file upload)
├── TimezoneResolver    (pre-flight disambiguation — hidden if all towns resolved)
│   └── TownResolver × N
└── GenerateButton      (disabled until TimezoneResolver complete)
```

---

## STILL TODO

- [x] Implement `createCalendarFile` — done
- [ ] **UID persistence** — UIDs are currently derived from `date:town` hash at generation time. Eventually, generated UIDs should be written back into the schedule JSON so that re-importing an updated schedule updates existing calendar events rather than duplicating them. An ICS→schedule function (or an import step) would receive the persisted UID from a previously exported file and attach it back to the matching show object.
- [ ] Create a GUI — see GUI PLAN section above
